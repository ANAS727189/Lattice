// Command persist-worker-service runs a background worker that persists document
// updates from Redis into the database.
package main

import (
	"context"
	"database/sql"
	"lattice/backend/internal/cache"
	"lattice/backend/internal/database"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// Worker encapsulates the dependencies needed to consume Redis updates and
// persist compacted snapshots to the database.
type Worker struct {
	// DB is the backing database connection.
	DB *sql.DB
	// RDB is the Redis client used for Pub/Sub and buffering.
	RDB *redis.Client
}

// main wires dependencies and starts the persistence loops.
func main() {
	db, err := database.NewMySQLDB()
	if err != nil {
		log.Fatal(err)
	}
	rdb := cache.NewRedisClient()
	worker := &Worker{DB: db, RDB: rdb}

	// This worker subscribes to a special "persistence" channel
	// or listens to all document channels via Pattern Subscribe
	go worker.listenAndStore()

	// Keep the worker running forever
	select {}
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
		updateData := []byte(msg.Payload)

		// Push update to a Redis List for this specific document
		// This acts as our temporary buffer so we don't lose data
		w.RDB.RPush(ctx, "buffer:"+docID, updateData)

		// Mark document as "dirty" in a Redis Set so the ticker knows what to save
		w.RDB.SAdd(ctx, "dirty_docs", docID)
	}
}

// startFlushTicker periodically flushes buffered updates to the database.
func (w *Worker) startFlushTicker() {
	ticker := time.NewTicker(30 * time.Second)
	ctx := context.Background()

	for range ticker.C {
		// Get all docs that have pending updates
		docIDs, _ := w.RDB.SMembers(ctx, "dirty_docs").Result()

		for _, docID := range docIDs {
			w.flushToDB(docID)
			// Remove from dirty set after processing
			w.RDB.SRem(ctx, "dirty_docs", docID)
		}
	}
}

// flushToDB drains a document's buffered updates, compacts them, and writes the
// resulting snapshot into the database.
func (w *Worker) flushToDB(docID string) {
	ctx := context.Background()
	listKey := "buffer:" + docID

	// 1. Atomically get and delete all updates from the Redis buffer
	// This ensures we don't process the same updates twice
	updates, err := w.RDB.LRange(ctx, listKey, 0, -1).Result()
	if err != nil || len(updates) == 0 {
		return
	}
	w.RDB.Del(ctx, listKey)

	// Convert string slice from Redis back to binary slice
	byteUpdates := make([][]byte, len(updates))
	for i, v := range updates {
		byteUpdates[i] = []byte(v)
	}

	// 2. USE YOUR ENGINE: Run the advanced compaction
	finalSnapshot := w.ApplyAndCompact(docID, byteUpdates)

	// 3. Save the single, compacted snapshot to Postgres
	query := `UPDATE documents SET content_snapshot = ?, updated_at = NOW() WHERE id = ?`
	_, err = w.DB.Exec(query, finalSnapshot, docID)

	if err != nil {
		log.Printf("Failed to save doc %s: %v", docID, err)
	} else {
		log.Printf("Successfully compacted and saved doc: %s", docID)
	}
}
