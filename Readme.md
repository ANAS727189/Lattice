<p align="center">
  <img src="frontend/app/favicon.ico" alt="Lattice logo" width="72" height="72" />
</p>

# Lattice

Lattice is a real-time collaborative document editor built with a Go microservice backend and a Next.js frontend. It combines Yjs CRDTs for conflict-free editing, Redis Pub/Sub for fan-out, and PostgreSQL for durable storage.

## Highlights

- Real-time document collaboration over WebSockets
- Role-based access control for document sharing
- Stateless HTTP services with a dedicated sync service
- Redis-backed broadcast and a persistence worker
- Print-ready editor layout and A4 page styles

## Screenshots

![Landing page](frontend/public/app/landing-page.png)
![Login](frontend/public/app/login-screen.png)
![Home](frontend/public/app/home-page.png)
![Editor](frontend/public/app/editor-screen.png)

## Architecture

Lattice is split into a set of focused services that scale independently. The real-time sync service manages WebSocket connections, while a background worker persists CRDT updates and compacted snapshots.

![Architecture overview](architecture/google-doc.png)
![CRDT vs OT](architecture/crdt-vs-ot.png)
![Database schema](architecture/database_schema.png)

For a deeper write-up, see [docs/flow.md](docs/flow.md).

## Services

| Service | Purpose | Port | Notes |
| --- | --- | --- | --- |
| api-gateway | Auth, user search, health checks | 8080 | Swagger UI at `/swagger/index.html` |
| doc-service | Document CRUD and permissions | 8081 | Swagger UI at `/swagger/index.html` |
| sync-service | WebSocket collaboration | 8082 | WebSocket endpoint `/ws/:id` |
| persist-worker | Persist CRDT updates | n/a | Consumes Redis Pub/Sub |
| frontend | Next.js web app | 3000 | UI and editor |
| postgres | Primary data store | 5432 | Users, documents, permissions |
| redis | Pub/Sub and buffers | 6379 | Fan-out and persistence queues |
| minio | Object storage (optional) | 9000 | Local S3-compatible storage |

## Data Model

Core tables are created on startup by the backend services:

- `users`: accounts and display names
- `documents`: document metadata and compacted snapshots
- `document_permissions`: per-user access (viewer/editor)
- `document_updates`: persisted CRDT updates

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Editor: ProseMirror, y-prosemirror, Yjs
- Backend: Go 1.25, Echo, gorilla/websocket
- Data: PostgreSQL, Redis
- Docs: Swagger/OpenAPI

## Local Development

### Option A: Docker Compose (recommended)

From the backend directory:

```bash
cd backend
docker compose --env-file ./.env -f deployments/docker-compose.yaml up --build
```

Then open:

- Frontend: http://localhost:3000
- API health: http://localhost:8080/health
- Doc service Swagger: http://localhost:8081/swagger/index.html

### Option B: Makefile (Docker stack)

From the repo root:

```bash
make infra-up
```

Stop the stack:

```bash
make infra-down
```

Clean volumes:

```bash
make infra-clean
```

### Option C: Local services with Air (no Docker)

1. Create `backend/.env.local` with host-based settings:

```bash
DATABASE_URL=postgres://lattice_user:lattice@localhost:5432/lattice?sslmode=disable
DB_USER=lattice_user
DB_HOST=localhost
DB_PASSWORD=lattice
DB_PORT=5432
DB_NAME=lattice
REDIS_ADDR=localhost:6379
JWT_SECRET=lattice_secret
```

2. Load the env file and run services:

```bash
cd backend
set -a && source .env.local && set +a

make run-api
make run-doc
make run-sync
make run-worker
```

3. Frontend (separate terminal):

```bash
cd frontend
npm install
npm run dev
```

### Frontend Environment

The frontend uses these env vars when running locally:

- `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`)
- `NEXT_PUBLIC_DOCS_BASE_URL` (default `http://localhost:8081`)
- `NEXT_PUBLIC_SYNC_BASE_URL` (default `ws://localhost:8082`)

## Security

See [SECURITY.md](SECURITY.md) for reporting guidelines.
