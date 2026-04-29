// Command sync-service runs the realtime WebSocket service.
//
// It accepts client connections, routes binary updates to in-memory rooms, and
// publishes updates to Redis so multiple instances can fan-out changes.
//
// Swagger/OpenAPI:
// @title Lattice Sync Service
// @version 1.0
// @description WebSocket endpoint for realtime collaboration.
// @BasePath /
// @schemes http
//
// Security:
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Use "Bearer <token>"
package main

import (
	"context"
	"net/http"

	"lattice/backend/cmd/sync-service/hub"
	"lattice/backend/internal/cache"
	"lattice/backend/internal/middleware"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
	echoSwagger "github.com/swaggo/echo-swagger"

	_ "lattice/backend/cmd/sync-service/docs"
)

// rdb is the Redis client used to publish updates.
var rdb *redis.Client

// upgrader upgrades HTTP requests to WebSocket connections.
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true }, // Relax for dev
}

// handleClient registers a client with its document room and starts read/write pumps.
func handleClient(h *hub.ServiceHub, c *hub.Client) {
	// 1. Join Room (Thread-safe)
	h.Mu.Lock()
	room, exists := h.Rooms[c.DocID]
	if !exists {
		room = &hub.Room{
			Clients:    make(map[*hub.Client]bool),
			Broadcast:  make(chan []byte),
			Register:   make(chan *hub.Client),
			Unregister: make(chan *hub.Client),
		}
		h.Rooms[c.DocID] = room
		go runRoom(room) // Start the room's broadcast loop
	}
	h.Mu.Unlock()

	room.Register <- c

	// 2. Start Write Pump
	go func() {
		for msg := range c.Send {
			c.Conn.WriteMessage(websocket.BinaryMessage, msg)
		}
	}()

	// 3. Start Read Pump (Blocking)
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			room.Unregister <- c
			break
		}

		// PUBLISH to Redis: This makes the update visible to ALL servers
		err = rdb.Publish(context.Background(), c.DocID.String(), message).Err()
		if err != nil {
			// Log error - Redis is down or connection lost
		}
	}
}

// runRoom manages registration, unregistration, and message fan-out for one room.
func runRoom(r *hub.Room) {
	for {
		select {
		case client := <-r.Register:
			r.Clients[client] = true
		case client := <-r.Unregister:
			if _, ok := r.Clients[client]; ok {
				delete(r.Clients, client)
				close(client.Send)
			}
		case message := <-r.Broadcast:
			for client := range r.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(r.Clients, client)
				}
			}
		}
	}
}

// websocketHandler upgrades the HTTP request to a WebSocket connection.
//
// @Summary Connect to a document WebSocket
// @Tags sync
// @Security BearerAuth
// @Param id path string true "Document ID (UUID)"
// @Success 101 {string} string "Switching Protocols"
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /ws/{id} [get]
func websocketHandler(serviceHub *hub.ServiceHub) echo.HandlerFunc {
	return func(c echo.Context) error {
		docID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid document id"})
		}
		userID := c.Get("user_id").(uuid.UUID) // From JWT Middleware

		conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		client := &hub.Client{
			ID:    userID,
			Conn:  conn,
			DocID: docID,
			Send:  make(chan []byte, 256),
		}

		go handleClient(serviceHub, client)
		return nil
	}
}

// main configures the WebSocket route and starts the Echo HTTP server.
func main() {
	e := echo.New()
	serviceHub := hub.NewServiceHub()
	rdb = cache.NewRedisClient()

	// WS Route: /ws/:docID
	e.GET("/ws/:id", websocketHandler(serviceHub), middleware.JWTMiddleware)

	// Swagger UI: /swagger/index.html
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	e.Logger.Fatal(e.Start(":8082"))
}
