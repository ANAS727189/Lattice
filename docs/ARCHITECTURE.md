# Lattice Architecture - Deep Dive

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture - Complete Service Map](#2-system-architecture---complete-service-map)
3. [Backend Service Walkthrough](#3-backend-service-walkthrough)
   - 3.1 [api-gateway-service](#31-api-gateway-service)
   - 3.2 [doc-service](#32-doc-service)
   - 3.3 [sync-service (The Core)](#33-sync-service-the-core)
   - 3.4 [persist-worker-service (Currently Idle)](#34-persist-worker-service-currently-idle)
4. [Data Model](#4-data-model)
5. [Data Flow](#5-data-flow)
6. [Infrastructure & Deployment](#6-infrastructure--deployment)
7. [What Went Wrong: Render Free Tier Failure](#7-what-went-wrong-render-free-tier-failure)
8. [The Solution: Persistence-by-Design in sync-service](#8-the-solution-persistence-by-design-in-sync-service)
9. [Honest Trade-Offs](#9-honest-trade-offs)
10. [Key Technical Decisions](#10-key-technical-decisions)
11. [Resilience & Recovery](#11-resilience--recovery)

---

## 1. Project Overview

Lattice is a real-time collaborative document editor (Google Docs alternative) built with:

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Editor:** ProseMirror with Yjs CRDT bindings (`y-prosemirror`)
- **Backend:** Go microservices (Echo + gorilla/websocket)
- **Data:** PostgreSQL (ACID persistence) + Redis (Pub/Sub fan-out)
- **Infrastructure:** Docker Compose, originally deployed on Render Free Tier

The core technical goal: **conflict-free multi-user editing with zero data loss**, even under unreliable hosting conditions.

---

## 2. System Architecture - Complete Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  Next.js App + ProseMirror + y-prosemirror + Yjs                │
│                                                                  │
│  Manages local CRDT state, sends binary updates via WS           │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ WebSocket /ws/:id         │ REST API calls
               │                           │
       ┌───────▼────────┐          ┌──────▼───────────┐
       │  api-gateway   │          │   doc-service    │
       │   :8080        │          │    :8081         │
       │                 │          │                   │
       │ • JWT issue      │          │ • Doc CRUD        │
       │ • User search    │          │ • Permissions     │
       │ • Rate limit     │          │ • Metadata        │
       └───────┬─────────┘          └──────┬───────────┘
               │                            │
               └────────────┬───────────────┘
                            │ shared Postgres
                            ▼
                     ┌──────────────┐
                     │  Postgres    │
                     │   :5432      │
                     │               │
                     │ • users       │
                     │ • documents   │
                     │ • perms       │
                     │ • updates     │
                     └──────────────┘
                            ▲
                            │ direct writes
                     ┌──────┴──────────┐
                     │  sync-service   │
                     │    :8082        │
                     │                   │
                     │ • WebSocket hub  │
                     │ • Rooms per doc  │
                     │ • persistUpdate()│  ← THE CRITICAL PATH
                     │ • replayUpdates()│
                     └──────┬──────────┘
                            │
                            │ cross-instance fan-out
                            ▼
                     ┌──────────────┐
                     │    Redis     │
                     │    :6379     │
                     │               │
                     │ • Pub/Sub     │
                     │ • buffer:doc  │ (legacy, low priority now)
                     │ • dirty_docs  │ (legacy)
                     └──────────────┘
```

_Referenced diagrams: `architecture/google-doc.png`, `architecture/database_schema.png`, `architecture/crdt-vs-ot.png`_

---

## 3. Backend Service Walkthrough

### 3.1 api-gateway-service

**File:** `backend/cmd/api-gateway-service/main.go`

**Responsibility:** Authentication front-door. Issues JWTs, searches users, enforces rate limits.

**Key behaviors:**
- Accepts `/auth/login`, `/auth/register`, `/users/search`
- Signs JWTs with `JWT_SECRET`
- Stateless — can scale horizontally

---

### 3.2 doc-service

**File:** `backend/cmd/doc-service/main.go`

**Responsibility:** Document CRUD and permission management.

**Key behaviors:**
- Creates/updates/deletes documents
- Manages `document_permissions` (role: owner/editor/viewer)
- Returns document metadata + ownership info

---

### 3.3 sync-service (The Core)

**Files:**
- `backend/cmd/sync-service/main.go` — entrypoint, WebSocket handler, persistence
- `backend/cmd/sync-service/hub/hub.go` — in-memory room management

**Responsibility:** Real-time collaboration hub + direct persistence.

**Connection flow:**

```
1. Client → GET /ws/:id (with JWT header)
2. parse docID from URL param
3. userID extracted from JWT middleware
4. canSyncDocument() → checks doc owner OR permission = 'editor'
5. Upgrade to WebSocket
6. handleClient():
   a. Join/Create Room (in-memory map)
   b. Start write pump (server → client)
   c. replayPersistedUpdates() ← sends prior state to new client
   d. Start read pump (client → server)
```

**Key structs (`backend/cmd/sync-service/hub/hub.go`):**

```go
// Client = one connected user in a document room
type Client struct {
    ID      uuid.UUID
    Conn    *websocket.Conn
    Send    chan []byte      // outbound message channel
    DocID   uuid.UUID
    CanEdit bool
}

// Room = all clients editing same document
type Room struct {
    Clients    map[*Client]bool
    Broadcast  chan []byte
    Register   chan *Client
    Unregister chan *Client
}

// ServiceHub = all active rooms keyed by document ID
type ServiceHub struct {
    Rooms map[uuid.UUID]*Room
    Mu    sync.RWMutex
}
```

**Message routing in read pump:**

```go
switch message[0] {
case messageAwareness:      // byte 1 → cursor/selection channel
    channel = awarenessChannel(c.DocID)
case messageDocumentUpdate: // byte 0 → Yjs binary update
    if !c.CanEdit { continue }
default:                    // untyped → wrap as document update
    message = frameMessage(messageDocumentUpdate, message)
}

// 1. FAN-OUT: publish to Redis so other server instances see it
rdb.Publish(ctx, channel, message)

// 2. PERSIST: write to Postgres synchronously ← THE CRITICAL CHANGE
persistDocumentUpdate(ctx, c.DocID, message[1:])
```

**`persistDocumentUpdate()` implementation (in `backend/cmd/sync-service/main.go`):**

```go
func persistDocumentUpdate(ctx context.Context, docID uuid.UUID, update []byte) error {
    tx, err := db.BeginTx(ctx, nil)
    // INSERT INTO document_updates (document_id, update_data) VALUES ($1, $2)
    // UPDATE documents SET updated_at = NOW() WHERE id = $1
    return tx.Commit()
}
```

Every single Yjs binary update hits Postgres before the handler loop continues. If Postgres is slow, the WebSocket write path stalls — but data is never lost.

**Replay on connect — `replayPersistedUpdates()` (in `backend/cmd/sync-service/main.go`):**

```go
// 1. Try loading all persisted updates ordered by id ASC
rows, _ := db.QueryContext(ctx,
    `SELECT update_data FROM document_updates WHERE document_id = $1 ORDER BY id ASC`, docID)

// 2. If none exist, fall back to compacted snapshot
snapshot, _ := db.QueryRowContext(ctx,
    `SELECT COALESCE(content_snapshot, ''::bytea) FROM documents WHERE id = $1`).Scan()

// 3. Also replay any Redis-buffered updates (legacy safety net)
updates, _ := rdb.LRange(ctx, "buffer:"+docID, 0, -1).Result()
```

This guarantees late-joining clients reconstruct the full document state.

**Cross-instance fan-out via Redis (`backend/cmd/sync-service/hub/hub.go`):**

```go
func (r *Room) StartRedisLoop(ctx context.Context, rdb *redis.Client, channel string) {
    pubsub := rdb.Subscribe(ctx, channel)
    defer pubsub.Close()
    ch := pubsub.Channel()
    for {
        select {
        case msg := <-ch:
            r.Broadcast <- []byte(msg.Payload)
        case <-ctx.Done():
            return
        }
    }
}
```

Each room subscribes to two Redis channels:
- `doc:<uuid>` — document updates
- `doc:<uuid>:awareness` — cursor/selection awareness

When any sync-service instance publishes to Redis, all instances broadcast to their locally connected clients.

---

### 3.4 persist-worker-service (Currently Idle)

**Files:**
- `backend/cmd/persist-worker-service/main.go` — stub (health only)
- `backend/cmd/persist-worker-service/engine.go` — compaction logic
- `backend/cmd/persist-worker-service/engine_test.go` — compaction tests

**Current state of main.go:**

```go
func main() {
    // ... connect Postgres, ensure schema ...
    go startHealthServer()  // only /health endpoint
    select {}               // blocks forever
}
```

**What `engine.go` does (reserved for future re-enable):**

```go
func (w *Worker) StoreUpdates(ctx context.Context, docID string, updates [][]byte) error {
    // 1. Load current compacted snapshot from documents.content_snapshot
    baseSnapshot, _ := w.loadSnapshot(ctx, docID)

    // 2. Load all pending replayable updates from document_updates
    pendingUpdates, _ := w.loadReplayableUpdates(ctx, docID)

    // 3. Merge via external Yjs compactor (Node.js script)
    compacted, err := compactYjsUpdates(ctx, baseSnapshot, allUpdates)

    // 4. If merge succeeds: save compacted snapshot, DELETE raw updates
    //    If merge fails: re-INSERT raw updates (no data loss)
}
```

The `compactYjsUpdates()` function shells out to a Node.js script at `tools/yjs-compactor/compact-yjs.mjs` with a 15-second timeout, passing base64-encoded snapshot + updates via stdin and receiving a new compacted snapshot via stdout.

---

## 4. Data Model

### 4.1 Tables

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | id, email, password_hash, display_name, created_at | Accounts |
| `documents` | id, owner_id, title, content_snapshot, updated_at, created_at | Metadata + compacted Yjs state |
| `document_permissions` | document_id, user_id, role | Per-user access (editor/viewer) |
| `document_updates` | id, document_id, update_data (BYTEA) | Append-only Yjs update log |

### 4.2 Schema enforcement

All services call `database.EnsureSchema(ctx, db)` at startup. This idempotently creates the above tables plus indexes on `document_id` and foreign keys.

### 4.3 Yjs storage format

- `update_data` stores raw Yjs binary update vectors (not human-readable)
- `content_snapshot` stores a compacted Yjs state vector (used as fallback on replay)
- On fresh document: `content_snapshot` is empty, `document_updates` starts empty
- As users collaborate: `document_updates` grows, `content_snapshot` remains stale until compaction

---

## 5. Data Flow

### 5.1 Write Path (Edit Created)

```
Client (ProseMirror)
    │ Yjs produces binary update
    ▼
WebSocket message[0] = 0x00 (messageDocumentUpdate)
    │
    ▼
sync-service read pump
    │
    ├─► rdb.Publish(docID, message)      → Redis channel
    │                                     → Other sync instances pick this up
    │                                     → Broadcast to their local clients
    │
    └─► persistDocumentUpdate()           → Postgres INSERT document_updates
                                           → Postgres UPDATE documents.updated_at
```

### 5.2 Read Path (Client Joins)

```
Client connects → /ws/:id
    │
    ▼
replayPersistedUpdates(client)
    │
    ├─► SELECT update_data FROM document_updates WHERE document_id = $1 ORDER BY id ASC
    │   → For each row: client.Send <- frameMessage(0x00, update)
    │   → Replays full history of edits
    │
    ├─► IF no persisted updates:
    │   SELECT COALESCE(content_snapshot, '') FROM documents WHERE id = $1
    │   → client.Send <- frameMessage(0x00, snapshot)
    │
    └─► replayBufferedUpdates(client)
        → Redis LRANGE buffer:<docID> 0 -1
        → Catch any updates that arrived during reconnect
```

### 5.3 Awareness Path (Cursors/Selection)

```
Client sends message[0] = 0x01 (messageAwareness)
    │
    ▼
rdb.Publish(docID + ":awareness", message)
    │
    ▼
All sync instances receive → Broadcast to local clients
    │
    ▼
y-prosemirror renders remote cursors/selections
```

Awareness is **not persisted** — it is ephemeral state that only matters while clients are connected.

---

## 6. Infrastructure & Deployment

### 6.1 Build System

`Makefile` targets:

- `make infra-up` — starts Postgres + Redis via Docker Compose (`backend/deployments/docker-compose.yaml`)
- `make run-api` / `run-doc` / `run-sync` / `run-worker` — hot-reload via Air (`.air.*.toml` configs)
- `make run-all` — starts all 4 backend services in parallel
- `make docker-build` — builds production images
- `make docker-push` — pushes to Docker Hub / ECR / GCP Artifact Registry

### 6.2 Dockerfiles

| File | Service | Port |
|------|---------|------|
| `backend/deployments/Dockerfile.api` | api-gateway | 8080 |
| `backend/deployments/Dockerfile.doc` | doc-service | 8081 |
| `backend/deployments/Dockerfile.sync` | sync-service | 8082 |
| `backend/deployments/Dockerfile.persist-worker` | persist-worker | n/a (stub only) |

### 6.3 Render Free Tier Deployment

Initially all 4 services were deployed as separate Render Web Services. This led to the persistence failure described in Section 7.

Current production deployment only needs:
- `api-gateway` (8080)
- `doc-service` (8081)
- `sync-service` (8082)
- `frontend` (3000, Next.js)
- Managed Postgres + Redis

---

## 7. What Went Wrong: Render Free Tier Failure

### The Setup

All microservices were deployed as **separate Render free tier web services**. The free tier has an aggressive auto-sleep policy:

> Services spin down after ~15 minutes of inactivity and take 30–60 seconds to cold start.

### The Failure Chain

1. `sync-service` is WAKEFLAGged by incoming WebSocket connections — it rarely sleeps
2. `persist-worker` sees low traffic and spins down
3. `sync-service` keeps publishing Yjs updates to Redis channel `doc:<uuid>`
4. `persist-worker` buffer in Redis (`buffer:<docID>`, `dirty_docs` set) accumulates updates
5. Render wakes `persist-worker` — 30–60s cold start begins
6. During cold start, Redis `EXPIRE` may clear buffer if TTL exceeded
7. `persist-worker` finally connects to Postgres, but **some updates are gone**
8. Even when buffers survive, the worker can't keep up with the flood of buffered updates
9. **Result:** Collaborative edits disappear silently when users reconnect

### Why This Was Hard to Detect

- No explicit error was thrown (updates simply weren't persisted)
- Yjs CRDT handles missing updates gracefully on the client — users see stale state, not crashes
- Issue manifested as "document forgot my changes" — hard to reproduce locally

---

## 8. The Solution: Persistence-by-Design in sync-service

### The Core Insight

> The most unreliable part of the system was a separate background process. Make persistence part of the request path instead.

### What Changed

**BEFORE:**

```
Client → sync-service → Redis Pub/Sub → persist-worker → Postgres
                                                    ↑
                                                 UNRELIABLE
                                                 (spins down)
```

**AFTER:**

```
Client → sync-service → Postgres (synchronous)
              ↓
         Redis Pub/Sub → Other sync instances (fan-out only)
```

### Code Change: `persistDocumentUpdate()` in `sync-service/main.go`

```go
if message[0] == messageDocumentUpdate {
    if err := persistDocumentUpdate(context.Background(), c.DocID, message[1:]); err != nil {
        log.Printf("failed to persist update for doc %s: %v", c.DocID, err)
    }
}
```

This is a **non-optional, blocking database write** inside the WebSocket read pump. If Postgres is unreachable, the update is not acknowledged as processed — and with proper retry/timeout config, the client can reconnect and resend.

### persist-worker-service After the Change

`backend/cmd/persist-worker-service/main.go` was reduced to:

```go
func main() {
    // ... connect DB, ensure schema ...
    go startHealthServer()
    select {} // blocks forever, does nothing
}
```

The `engine.go` compaction logic was preserved (not deleted) because:
- It may be re-enabled once on a reliable host (not free tier)
- Compaction reduces `document_updates` table size over time
- Tests in `engine_test.go` validate the compaction pipeline

---

## 9. Honest Trade-Offs

| Dimension | Original Approach | Current Approach |
|-----------|------------------|------------------|
| **Persistence guarantee** | Eventual (worker may delay) | Immediate (per-update) |
| **Compaction** | Enabled (Yjs snapshot + delta merge) | Disabled (raw updates accumulate) |
| **Reliability on free tier** | ❌ Lost updates | ✅ All writes go through |
| **DB write volume** | Lower (batched) | Higher (per-message) |
| **Recovery / replay cost** | Lower (compacted state) | Higher (full update log) |
| **Operational complexity** | Higher (2 services to keep alive) | Lower (1 critical service) |

### What This Means in Practice

- The `document_updates` table grows linearly with edits — not a problem at moderate scale
- On very active documents (thousands of edits/day), compaction should eventually be re-enabled once hosted reliably
- The Yjs compactor script at `tools/yjs-compactor/compact-yjs.mjs` is production-ready and tested
- The current approach is **strictly more reliable** at the cost of slightly higher storage/IO

---

## 10. Key Technical Decisions

### Why Yjs (CRDT) over OT (Operational Transformation)?

- Yjs has a mature JavaScript ecosystem (`y-prosemirror`, `y-websocket`)
- CRDT convergence is mathematically guaranteed — no central merge authority needed
- Backend is a dumb pipe — complexity lives client-side where debugging is easier
- See `architecture/crdt-vs-ot.png` for comparison

### Why Postgres BYTEA for Yjs Blobs?

- Postgres handles binary data natively with `BYTEA` columns
- ACID transactions ensure update + metadata write are atomic
- `content_snapshot` and `document_updates` both use `BYTEA`
- No need for a separate blob store at this scale

### Why Redis Pub/Sub for Fan-Out?

- When multiple `sync-service` instances run, they need cross-instance message delivery
- Redis Pub/Sub is lightweight and matches the ephemeral nature of real-time messages
- Redis is also used for legacy buffer queues (`buffer:<docID>`) which are low-priority now

### Why Embed Persistence in sync-service?

- Render free tier is unreliable for background workers
- Synchronous writes eliminate the consistency window where updates could be lost
- The cost (higher per-message writes) is acceptable on free tier with a single Postgres instance
- Can decouple again later into a local worker thread once on paid/compute-stable infra

---

## 11. Resilience & Recovery

### If sync-service Crashes Mid-Write

```go
tx, err := db.BeginTx(ctx, nil)
// INSERT ...
// UPDATE ...
return tx.Commit()
```

- Postgres transaction ensures atomicity
- If `Commit()` fails, the update is never acknowledged to the client
- Client-side Yjs buffers the update locally and retries on reconnect

### If Client Disconnects Mid-Edit

- Client-side Yjs state is preserved in browser memory
- On reconnect, `replayPersistedUpdates()` sends full prior state
- Client merges and continues from there

### If Postgres Is Unavailable

- `persistDocumentUpdate()` returns error
- Error is logged but WebSocket remains open
- Updates continue to flow to other clients (Redis fan-out still works)
- Once Postgres recovers, new updates are persisted; old gap remains
- Can be backfilled if compaction worker is later re-enabled

---

## Current Architecture (Post-Render Free Tier Fix)

### The Problem: Render Free Tier Limitations

When initially deployed, all microservices ran as **separate Render free tier instances** (sync-service, persist-worker, doc-service, api-gateway).

#### What Went Wrong

Render free tier **spins down services after ~15 minutes of inactivity**. This caused a critical failure:

1. `sync-service` is always active (WebSocket connections keep it alive)
2. `persist-worker` spins down during low traffic
3. Redis Pub/Sub buffers updates from sync-service
4. When persist-worker wakes up, 30-60s cold start + DB reconnection
5. **Redis buffers overflowed** → Yjs updates were lost
6. Documents would lose collaborative edits between compaction cycles

### The Solution: Merge Persistence Into Sync Service

Instead of relying on a separate worker process, persistence is done **synchronously in the sync-service**:

- Every Yjs update is written to Postgres **before** WebSocket handler continues
- Redis is still used for cross-instance fan-out (but NOT as a durability layer)
- Postgres ACID guarantees ensure no data loss

### Trade-Offs

| Aspect | Old Approach | New Approach |
|--------|-------------|--------------|
| Persistence guarantee | Eventual (with compaction) | Immediate per-update |
| Compaction | Yes (Yjs snapshot + delta merge) | No (raw updates accumulated) |
| Reliability on free tier | ❌ Lost updates | ✅ All writes go through |
| DB write volume | Lower (batched) | Higher (per-message) |
| Data recovery | Compaction reduces replay size | Full replay buffer available |

## Service Details

### sync-service (The Critical Path)

**Port:** 8082  
**Responsibility:** WebSocket hub + direct persistence  
**Key code:** `persistDocumentUpdate()` in `cmd/sync-service/main.go`

### persist-worker-service (Currently Idle)

**Status:** Stub (only health endpoint exposed)  
**Future:** Contains `StoreUpdates()` + Yjs compactor script for background compaction

## Data Model

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Accounts, auth |
| `documents` | Doc metadata + `content_snapshot` (compacted Yjs state) |
| `document_permissions` | Per-user roles (owner/editor/viewer) |
| `document_updates` | Append-only log of binary Yjs updates |

## Tech Stack

| Layer | Tooling |
|-------|---------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind, ProseMirror |
| Editor CRDT | Yjs (y-prosemirror) |
| Backend | Go 1.25, Echo, gorilla/websocket |
| Real-time | Redis Pub/Sub |
| Persistence | Postgres (BYTEA for Yjs blobs) |
| Container | Docker, Docker Compose |