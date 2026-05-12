// Command persist-worker-service exposes a lightweight health endpoint.
//
// Document persistence now happens directly in sync-service.
package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"lattice/backend/internal/database"

	"github.com/joho/godotenv"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const messageDocumentUpdate byte = 0

// Worker encapsulates the dependencies needed to consume Redis updates and
// persist replayable document updates to the database.
type Worker struct {
	// DB is the backing database connection.
	DB *sql.DB
	// RDB is the Redis client used for Pub/Sub and buffering.
	RDB *redis.Client
}

// main wires dependencies and starts the persistence loops.
func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found (or error loading it). Relying on system environment variables.")
	}
	db, err := database.NewPostgresDB()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	if err := database.EnsureSchema(context.Background(), db); err != nil {
		log.Fatal(err)
	}

	go startHealthServer()

	// Keep the worker running forever
	select {}
}

func startHealthServer() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Printf("health server stopped: %v", err)
	}
}

// listenAndStore subscribes to all channels and buffers incoming updates in Redis.
func (w *Worker) listenAndStore() {
	ctx := context.Background()
	pubsub := w.RDB.PSubscribe(ctx, "*")
	defer pubsub.Close()

	ch := pubsub.Channel()

	// Start a separate "Flush Ticker" to periodically save dirty docs
	go w.startFlushTicker()

	for msg := range ch {
		docID := msg.Channel
		if _, err := uuid.Parse(docID); err != nil {
			continue
		}
		updateData := []byte(msg.Payload)
		if len(updateData) == 0 {
			continue
		}
		if updateData[0] != messageDocumentUpdate {
			continue
		}
		updateData = updateData[1:]

		// Push update to a Redis List for this specific document
		// This acts as our temporary buffer so we don't lose data
		w.RDB.RPush(ctx, "buffer:"+docID, updateData)

		// Mark document as "dirty" in a Redis Set so the ticker knows what to save
		w.RDB.SAdd(ctx, "dirty_docs", docID)
	}
}

// startFlushTicker periodically flushes buffered updates to the database.
func (w *Worker) startFlushTicker() {
	ticker := time.NewTicker(flushInterval())
	ctx := context.Background()

	for range ticker.C {
		// Get all docs that have pending updates
		docIDs, _ := w.RDB.SMembers(ctx, "dirty_docs").Result()

		for _, docID := range docIDs {
			// Remove before processing so updates arriving during this flush mark
			// the document dirty for the next tick.
			w.RDB.SRem(ctx, "dirty_docs", docID)
			w.flushToDB(docID)
		}
	}
}

func flushInterval() time.Duration {
	seconds, err := strconv.Atoi(os.Getenv("PERSIST_FLUSH_SECONDS"))
	if err != nil || seconds < 1 {
		return 5 * time.Second
	}
	return time.Duration(seconds) * time.Second
}

// flushToDB drains a document's buffered updates and writes them to the database.
func (w *Worker) flushToDB(docID string) {
	ctx := context.Background()
	listKey := "buffer:" + docID

	updates, err := redis.NewScript(`
		local updates = redis.call("LRANGE", KEYS[1], 0, -1)
		if #updates > 0 then
			redis.call("DEL", KEYS[1])
		end
		return updates
	`).Run(ctx, w.RDB, []string{listKey}).StringSlice()
	if err != nil || len(updates) == 0 {
		if err != nil {
			log.Printf("Failed to drain Redis buffer for doc %s: %v", docID, err)
		}
		return
	}

	// Convert string slice from Redis back to binary slice
	byteUpdates := make([][]byte, len(updates))
	for i, v := range updates {
		byteUpdates[i] = []byte(v)
	}

	if err := w.StoreUpdates(ctx, docID, byteUpdates); err != nil {
		log.Printf("Failed to save doc %s: %v", docID, err)
	} else {
		log.Printf("Successfully persisted %d updates for doc: %s", len(byteUpdates), docID)
	}
}
