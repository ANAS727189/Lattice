# Making a Google Doc From Scratch

## Project Architecture

## 1. Summary & Goals
This project aims to build a highly scalable, real-time collaborative rich-text editor using a modern Go backend and Next.js frontend. The core technical challenge lies in synchronizing state across multiple active clients without data loss or race conditions.

## 2. Final Technology Stack

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
Listens to document updates and periodically saves compacted Yjs snapshots to PostgreSQL. Decouples real-time operations from disk I/O.

### Presence Service (Awareness)
Handles transient state like cursors, selections, and active users using Yjs awareness protocol. Not persisted.

### Object Store Service (S3)
Stores media files externally and keeps only references in the document state to maintain performance.

## 4. The CRDT Strategy

### Production Approach (Yjs)
Client-side CRDT handling. Backend only forwards binary updates without merging logic.

### RGA Learning Track
Custom implementation of Replicated Growable Array in Go for plain-text synchronization to deeply understand CRDT internals.

## 5. Implementation Roadmap

### Phase 1: Foundation (Auth & API)
Set up Echo server, PostgreSQL schemas, JWT authentication, and basic REST APIs.

### Phase 2: UI Layer
Initialize Next.js app, integrate ProseMirror, and build static editor interface.

### Phase 3: Real-Time Sync (Single Server)
Implement WebSocket communication and enable real-time collaboration across clients.

### Phase 4: Database Persistence
Develop background worker to persist Yjs state periodically.

### Phase 5: Scale-Out (Redis)
Introduce Redis Pub/Sub and test multi-server synchronization.

### Phase 6: RGA Sandbox
Build custom CRDT (RGA) in Go as a learning exercise.