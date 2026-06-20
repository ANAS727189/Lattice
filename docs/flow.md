# Making a Google Doc From Scratch

## 1. Summary
This project aims to build a highly scalable, real-time collaborative rich-text editor using a modern Go backend and Next.js frontend. The core technical challenge lies in synchronizing state across multiple active clients without data loss or race conditions.

## 2. Technology Stack

| Layer | Choice | Rationale |
|------|--------|----------|
| Frontend Framework | Next.js | Industry standard React framework, excellent for SEO, structured routing, and component management. |
| Backend Language | Go (Golang) | High performance, excellent concurrency model (goroutines/channels) specifically suited for concurrent WebSocket handling. |
| HTTP Routing | Echo | Clean API, runs on the standard net/http library, ensuring compatibility with standard WebSocket packages. |
| WebSockets | gorilla/websocket | The most mature and widely-used standard for WebSockets in Go. |
| Conflict Resolution | Yjs (CRDT) | Mathematical guarantees against data divergence. The backend acts as a fast routing pipe for binary updates. |
| Editor UI | ProseMirror + y-prosemirror | Battle-tested rich text editor with first-class, out-of-the-box bindings for Yjs. |
| Database | PostgreSQL | ACID compliant, perfect for relational data (users/permissions) and handles Yjs binary blobs via BYTEA columns natively. |
| Pub/Sub Cache | Redis | Essential for horizontal scaling to route real-time WebSocket messages between different Go server instances. |
| Object Storage | Amazon S3 (or MinIO) | Offloads large media files (images, PDFs) from the main database, keeping the sync fast and lightweight. |

## 3. Microservices Architecture

To ensure scalability and separation of concerns, the backend is architected into the following microservices:

### API Gateway & Authentication Service (Stateless)
Handles user registration, login, JWT token issuance, rate limiting, and acts as the front door. Scales horizontally based on HTTP traffic.

### Document Management Service (Stateless)
Manages RESTful CRUD operations including document creation, deletion, renaming, metadata retrieval, and permission updates. Prevents heavy DB queries from blocking real-time systems.

### Real-Time Sync Service (Stateful - Core)
Acts as the WebSocket hub. Maintains active connections, manages in-memory document rooms, receives Yjs binary updates, and broadcasts them. Uses Redis Pub/Sub for cross-instance communication.

### Persistence Worker (Background Daemon)
Originally listened to document updates via Redis and periodically saved compacted Yjs snapshots to PostgreSQL, decoupling real-time operations from disk I/O. **Current status: idle/stub.** Due to Render free tier auto-sleep, persistence logic was moved directly into `sync-service` to guarantee every update is written to Postgres before the WebSocket handler continues. The compaction code in `engine.go` is preserved for future re-enablement on reliable hosting.

### Presence Service (Awareness)
Handles transient state like cursors, selections, and active users using Yjs awareness protocol. Not persisted.

### Object Store Service (S3)
Planned external storage for media files (images, PDFs) to keep the main database lean. **Current status: not implemented.** The schema includes MinIO as an optional local development dependency, but no backend service handles uploads yet.

## 4. The CRDT Strategy

### Production Approach (Yjs)
Client-side CRDT handling. Backend only forwards binary updates without merging logic.

### RGA Learning Track
Custom implementation of Replicated Growable Array in Go for plain-text synchronization to deeply understand CRDT internals.

---

## 5. What are Microservices?

Microservices is an architectural style where an application is built as a suite of small, independent services, each running in its own process and communicating with lightweight mechanisms (HTTP, WebSockets, message queues).

Each service in Lattice owns a single business capability:
- **api-gateway** owns authentication
- **doc-service** owns document CRUD
- **sync-service** owns real-time collaboration state

Benefits: independent deployability, technology flexibility per service, and fault isolation. Cost: more infrastructure to manage and more network hops between services.

---

## 6. What are CRDTs?

**CRDT = Conflict-free Replicated Data Type**

A CRDT is a data structure designed to be replicated across multiple computers without coordination. It guarantees that all replicas converge to the same state eventually, regardless of:

- The order in which updates arrive
- Network delays or partitions
- How many users are editing simultaneously

**Simple analogy:** Two people edit the same document offline for an hour, then come online. A CRDT ensures their edits merge automatically without losing anyone's changes, without needing a central authority.

**Key property:** Mathematical convergence guarantees. If every replica receives the same set of updates (in any order), the final state will be identical.

**Two main categories:**
- **CvRDT (Convergent):** State-based. Periodically sends full state; receiver merges via a `merge()` function.
- **CmRDT (Commutative):** Operation-based. Sends individual operations; the communication layer ensures delivery to all replicas.

Lattice uses a **CmRDT** approach — Yjs sends binary operation updates, and every client + server applies them in the same order.

---

## 7. CRDT vs Operational Transformation (OT)

**OT (Operational Transformation)** is the older approach used by early Google Docs.

| Aspect | CRDT (Yjs) | OT (Google Docs style) |
|--------|-----------|------------------------|
| Core idea | Data types that merge automatically | Transform operations against concurrent ops |
| Convergence proof | Mathematical (monotonic semilattice) | Requires complex correctness proofs |
| Offline support | Native — edits accumulate and merge on reconnect | Hard — must track all ops since disconnect |
| Central server role | Can be "dumb pipe" — just broadcasts ops | Must be authoritative transformer |
| Implementation complexity | Lower (library handles it) | Very high |
| Examples | Yjs, automerge | ShareDB, Apache Wave |

**Why Lattice chose CRDT (Yjs):**
- **Offline-first:** Users can edit while disconnected; changes merge on reconnect. With OT, offline editing requires complex buffering and transformation pipelines.
- **Dumb server:** The backend becomes a simple broadcast pipe. No merge logic lives server-side, which eliminates a whole class of bugs.
- **Ecosystem:** Yjs has first-class ProseMirror bindings that just work.
- **Correctness confidence:** CRDT convergence is provable by construction. OT requires per-operation transformation correctness proofs that are hard to maintain.

The trade-off is that CRDT metadata can grow over time. Yjs's compact binary format and the compaction strategy in Lattice keep this manageable.

---

## 8. What is Yjs?

**Yjs** is an open-source, high-performance CRDT implementation in JavaScript, created by Kevin Jahns. It is one of the most widely used CRDT libraries for collaborative editing.

**What Yjs provides:**
- **Y.Doc:** Top-level document container that holds shared data types.
- **Shared types:** `Y.Text` (rich text), `Y.Array`, `Y.Map`, `Y.XmlFragment` (for ProseMirror).
- **Yjs binary protocol:** Compact binary encoding of updates and state vectors. A single character edit produces a ~10-30 byte update.
- **Undo/Redo:** Built-in support that tracks the CRDT operation history.
- **Awareness:** Ephemeral state (cursors, selections, user presence) that is NOT persisted.
- **Encoding/Decoding:** Update encoder (uencode/udecode) and state vectors for efficient sync.

**Yjs is NOT:** an editor, a backend, or a network protocol. It is a **local-first data structure** that handles merge logic. The editor (ProseMirror) and network (WebSockets) are layered on top.

---

## 9. What is RGA?

**RGA = Replicated Growable Array**

RGA is a specific CRDT algorithm designed for ordered sequences (like lists of characters in a text document). It was introduced by Ramiro et al. and is one of the foundational sequence CRDTs.

**The problem RGA solves:**
When two users concurrently insert characters at the same position, how do you deterministically order them so all replicas agree?

**RGA's approach:**
1. Every item in the sequence gets a unique ID: `(clientID, lamportClock)`.
2. An item also stores a `tomb` (the ID of the item it was inserted after, or the concurrent item it "broke the tie" with).
3. When a replica receives two concurrent inserts at the same position, it uses a deterministic tie-breaking rule (e.g., sort by `clientID`).
4. Items can be **tombstoned** (logically deleted) rather than physically removed, preserving ordering.

**Why RGA matters to Lattice:**
- The original project plan included building a **custom RGA implementation in Go** as a learning exercise (see `custom/rga.go` in the repo).
- This "RGA sandbox" was Phase 6 of the original roadmap, intended to deeply understand CRDT internals.
- In production, Lattice uses **Yjs** (which internally uses a similar but more optimized sequence CRDT called YATA) rather than a hand-rolled RGA.

**RGA vs Yjs internal sequence algorithm (YATA):**
- RGA uses `(clientID, clock, tomb)` triples for each item.
- Yjs YATA uses `(clientID, clock)` pairs with a **peer-less left/right** neighbor reference.
- YATA is more efficient for ProseMirror integration because it maps cleanly to the editor's document model.

---

## 10. Why Yjs instead of a Custom RGA?

**Production decision:** Use Yjs library.  
**Learning exercise:** Implement basic RGA in Go (exists in `custom/rga.go`).

**Reasons for Yjs in production:**
1. **Maturity:** Years of bug fixes, edge case handling, and community testing.
2. **ProseMirror integration:** The `y-prosemirror` binding handles all the tricky mapping between ProseMirror's step-based model and Yjs's update model.
3. **Performance:** Yjs binary encoding is highly optimized; a custom RGA in Go would require serialization/deserialization at every WebSocket boundary, adding latency.
4. **Interoperability:** Yjs has bindings for Monaco (code), Slate, Quill, etc. If the editor needs to change, the CRDT layer doesn't.
5. **Future features:** Undo/redo, awareness, offline persistence, version history — all built-in.

**What the custom RGA experiment provided:**
- Deep understanding of how sequence CRDTs assign unique IDs
- Hands-on experience with lamport clocks, tombstones, and merge ordering
- The `custom/rga.md` file documents the implementation notes.

---

## 11. How Yjs is Used in Lattice

### 11.1 Client-Side (ProseMirror + y-prosemirror)

**Flow:**
```
ProseMirror (user types)
    ↓ Editor step
y-prosemirror (step → Yjs op)
    ↓ Yjs binary update
WebSocket [0x00, ...binaryUpdate...]
    ↓
sync-service
```

**Code reference:**
- Frontend hooks initialize Y.Doc and bind it to ProseMirror via `y-prosemirror`.
- Yjs awareness protocol handles cursor/selection broadcast (not persisted).

### 11.2 Server-Side (sync-service)

The server treats Yjs as an **opaque binary protocol**. It does NOT decode or merge updates — it only routes them.

**Files:**
- `backend/cmd/sync-service/main.go` — WebSocket handler, persistence
- `backend/cmd/sync-service/hub/hub.go` — Room management, Redis subscriptions

**Message format over the wire:**
```
[messageType: 1 byte][payload: variable]
  messageType values:
    0x00 = documentUpdate  → binary Yjs update
    0.01 = awareness       → cursor/selection JSON
```

**Server behavior:**
1. Receive binary message from client
2. Inspect message[0]
3. If 0x00 (Yjs update):
   - Publish to Redis channel `doc:<uuid>` (fan-out to other server instances)
   - Call `persistDocumentUpdate()` → Postgres INSERT into `document_updates`
4. If 0x01 (awareness):
   - Publish to Redis channel `doc:<uuid>:awareness` (fan-out only, not persisted)

**The server NEVER:**
- Decodes Yjs binary updates
- Merges concurrent updates
- Validates document state
- Computes diffs

This is the **dumb pipe** architecture. All intelligence lives client-side.

### 11.3 Persistence Layer (Postgres)

**Tables that store Yjs data:**
```sql
-- The append-only log of raw Yjs binary updates
CREATE TABLE document_updates (
    id SERIAL PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id),
    update_data BYTEA NOT NULL,  -- raw Yjs binary
    created_at TIMESTAMP DEFAULT NOW()
);

-- Compacted Yjs snapshot (fallback / compression target)
ALTER TABLE documents ADD COLUMN content_snapshot BYTEA;
```

**Write path:**
```go
// Every update goes here
INSERT INTO document_updates (document_id, update_data) VALUES ($1, $2)
```

**Read path (replay):**
```go
// On new client connect, load history in order
SELECT update_data FROM document_updates 
WHERE document_id = $1 ORDER BY id ASC
```

**Replay to client:**
```go
c.Send <- frameMessage(messageDocumentUpdate, update) // prepends 0x00
```

The client's Yjs document applies each update in order, reconstructing the full document state.

### 11.4 Compaction (Currently Disabled)

When re-enabled, `persist-worker-service/engine.go` runs the Yjs compactor:

```go
// 1. Load compacted snapshot from documents.content_snapshot
// 2. Load all pending updates from document_updates
// 3. Run: node tools/yjs-compactor/compact-yjs.mjs
// 4. If success: save snapshot, delete raw updates
// 5. If failure: re-INSERT raw updates (no data loss)
```

This reduces the `document_updates` table from thousands of rows to zero (all edits condensed into one snapshot).

---

## 12. End-to-End Scenarios

### Scenario 1: Two Users Editing Simultaneously

```
Time  | Client A                         | Redis                        | Client B
------|----------------------------------|------------------------------|-------------------
T0    | Inserts "Hello" at pos 0         |                              |
T1    | → ws: [0x00, update_A1]         | ←-----------                 |
T2    |                                  | →-------- [0x00, A1] -------►│ applies update
T3    |                                  |                              │ Inserts "!" at pos 5
T4    |                                  | ←--------- [0x00, B1] ------►│
T5    | ←------- receives B1            |                              │
T6    | applies B1                       |                              │
T7    | Inserts "World" at pos 11        |                              │
T8    | → ws: [0x00, update_A2]         | ←---------                   |
T9    |                                  | →-------- [0x00, A2] -------►│ applies A2
T10   | ←-------- receives A2           |                              │
T11   | applies A2                       |                              │
```

Both clients end up with identical state: `"Hello! World"` (with CRDT ordering guarantees ensuring deterministic merge order even if messages arrive out of order).

### Scenario 2: Network Partition / Server Restart

```
Time  | Frontend A               | sync-service (crash)      | Frontend B
------|--------------------------|---------------------------|---------------------------
T0    | Inserts text             |                           |
T1    | → ws: [0x00, update]    |                           |
T2    | (connection drops)      | CRASH / redeploy          |
T3    | ← WS closed             | (Postgres still alive)    | Insert continues
T4    | Yjs buffers locally     |                           | → ws: [0x00, B_update]
T5    |                          |                           | ←-------------------------│
T6    | sync-service recovers   | ←-------------------------│
T7    | ← WS reconnects         |                           |
T8    | replayPersistedUpdates()|                           |
T9    | ← [0x00, all prior]     |                           |
T10   | Y.Doc applies all       |                           |
T11   | Editor shows full state |                           |
T12   | ← [0x00, B_update]      | ←────────────────────────│
T13   | applies B_update         |                           |
```

Result: No data loss. Both clients converge.

### Scenario 3: Persist Worker Was Down (The Render Free Tier Bug)

```
Time  | sync-service                    | Redis buffer                        | persist-worker
------|---------------------------------|-------------------------------------|-----------------
T0    | Publishes Yjs update           |                                     │
T1    | → rdb.Publish(doc, msg)        │ buffer:<doc> LPUSH msg             │
T2    |                                 │ dirty_docs SADD doc                │
T3    |                                 │                                     │ spins down (Render free tier)
T4    |                                 │ buffer:<doc> keeps growing          │
T5    |                                 │ dirty_docs still has doc            │
T6    |                                 │ ... 15 minutes pass ...             │
T7    |                                 │                                     │ Render wakes worker
T8    |                                 │                                     │ 30-60s cold start
T9    |                                 │ buffer:<doc> EXPIRE may clear it    │
T10   |                                 │                                     │ Postgres connects
T11   |                                 │                                     │ starts flushToDB
T12   |                                 │                                     │ LRANGE returns empty
T13   |                                 │                                     │ MSG: "Flushed 0 updates"
      │                                 │                                     │
      │ RESULT: edits lost forever     │ RESULT: stale in-memory state       │
```

**How this was fixed:** `persistDocumentUpdate()` now runs inside `sync-service`'s WebSocket handler. There is no longer a separate process that can sleep.

---

## 13. Summary: The Architecture in One Sentence

Lattice uses Yjs CRDTs on the client to enable conflict-free real-time editing, a Go WebSocket hub (sync-service) to fan-out binary updates via Redis, and synchronous Postgres writes to guarantee no data loss — even when background workers can't be trusted to stay awake.

