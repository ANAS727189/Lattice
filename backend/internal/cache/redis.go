// Package cache provides lightweight clients for external caching services.
//
// Today it includes a Redis client constructor used by sync and worker services.
package cache

import (
	"os"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient returns a Redis client configured via environment variables.
//
// Environment:
//   - REDIS_ADDR: host:port (defaults to "localhost:6379")
func NewRedisClient() *redis.Client {
	addr := os.Getenv("REDIS_ADDR") // e.g., "localhost:6379"
	if addr == "" {
		addr = "localhost:6379"
	}

	return redis.NewClient(&redis.Options{
		Addr: addr,
	})
}
