// Package database provides helpers for connecting to the application's database.
//
// It currently supports MySQL via database/sql.
package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

// NewMySQLDB creates a MySQL connection using environment variables.
//
// Environment:
//   - DB_USER
//   - DB_PASSWORD
//   - DB_HOST
//   - DB_PORT
//   - DB_NAME
//
// The returned DB is opened but not pinged; callers may choose to Ping/PingContext
// to fail fast on startup.
func NewMySQLDB() (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_NAME"))
	return sql.Open("mysql", dsn)
}
