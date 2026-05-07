// Package cache provides lightweight clients for external caching services.
//
// Today it includes a Redis client constructor used by sync and worker services.
package cache

import (
	"crypto/tls"
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient returns a Redis client configured via environment variables.
//
// Environment:
//   - REDIS_ADDR: host:port (defaults to "localhost:6379")
//   - REDIS_USERNAME: optional username
//   - REDIS_PASSWORD: optional password
//   - REDIS_TLS: true/1 to enable TLS
func NewRedisClient() *redis.Client {
	addr := os.Getenv("REDIS_ADDR") // e.g., "localhost:6379"
	if addr == "" {
		addr = "localhost:6379"
	}

	username := os.Getenv("REDIS_USERNAME")
	password := os.Getenv("REDIS_PASSWORD")
	useTLS := strings.EqualFold(os.Getenv("REDIS_TLS"), "true") || os.Getenv("REDIS_TLS") == "1"

	var tlsConfig *tls.Config
	if useTLS {
		tlsConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}

	return redis.NewClient(&redis.Options{
		Addr:      addr,
		Username:  username,
		Password:  password,
		TLSConfig: tlsConfig,
	})
}
