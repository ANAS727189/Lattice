// Package hub defines the in-memory data structures for the sync-service.
//
// It models connected clients and per-document rooms used to broadcast updates.
package hub

import (
	"context"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

// Client represents a single connected user in a document room.
type Client struct {
	ID      uuid.UUID
	Conn    *websocket.Conn
	Send    chan []byte // Channel for outbound messages
	DocID   uuid.UUID
	CanEdit bool
}

// Room manages a group of clients editing the same document.
type Room struct {
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
}

// ServiceHub holds all active rooms keyed by document ID.
type ServiceHub struct {
	Rooms map[uuid.UUID]*Room
	Mu    sync.RWMutex
}

// NewServiceHub creates an empty hub with no rooms.
func NewServiceHub() *ServiceHub {
	return &ServiceHub{
		Rooms: make(map[uuid.UUID]*Room),
	}
}

// StartRedisLoop subscribes to a document channel and forwards messages into the room.
//
// This enables cross-instance fan-out when multiple sync-service processes are running.
func (r *Room) StartRedisLoop(ctx context.Context, rdb *redis.Client, channel string) {
	pubsub := rdb.Subscribe(ctx, channel)
	defer pubsub.Close()

	ch := pubsub.Channel()

	for {
		select {
		case msg := <-ch:
			// Received message from Redis (potentially from another server)
			// Broadcast it to all locally connected clients in this room
			r.Broadcast <- []byte(msg.Payload)
		case <-ctx.Done():
			return
		}
	}
}
