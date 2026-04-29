// Package models defines domain-level data structures shared across services.
//
// These structs represent entities persisted in the database and/or exchanged
// over HTTP APIs.
package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents an account in the system.
type User struct {
	ID           uuid.UUID `db:"id" json:"id"`
	Email        string    `db:"email" json:"email"`
	PasswordHash string    `db:"password_hash" json:"-"`
	DisplayName  string    `db:"display_name" json:"display_name"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

// Document represents a collaborative document.
type Document struct {
	ID              uuid.UUID `db:"id" json:"id"`
	Title           string    `db:"title" json:"title"`
	OwnerID         uuid.UUID `db:"owner_id" json:"owner_id"`
	ContentSnapshot []byte    `db:"content_snapshot" json:"-"` // Binary blob
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at" json:"updated_at"`
}

// DocumentPermission grants a user a role on a document.
type DocumentPermission struct {
	DocumentID uuid.UUID `db:"document_id" json:"document_id"`
	UserID     uuid.UUID `db:"user_id" json:"user_id"`
	Role       string    `db:"role" json:"role"` // 'viewer', 'editor'
}
