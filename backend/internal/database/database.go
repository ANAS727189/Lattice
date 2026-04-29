// Package database provides helpers for connecting to the application's database.
//
// It currently supports PostgreSQL via database/sql.
package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

// NewPostgresDB creates a PostgreSQL connection using environment variables.
//
// Environment:
//   - DATABASE_URL (optional, takes precedence)
//   - DB_USER
//   - DB_PASSWORD
//   - DB_HOST
//   - DB_PORT
//   - DB_NAME
//
// The returned DB is opened but not pinged; callers may choose to Ping/PingContext
// to fail fast on startup.
func NewPostgresDB() (*sql.DB, error) {
	if dsn := os.Getenv("DATABASE_URL"); dsn != "" {
		return sql.Open("postgres", dsn)
	}

	host := getenv("DB_HOST", "localhost")
	port := getenv("DB_PORT", "5432")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	name := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host,
		port,
		user,
		password,
		name,
	)
	return sql.Open("postgres", dsn)
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
