package database

import (
	"context"
	"database/sql"
)

// EnsureSchema creates the minimal PostgreSQL schema required by the services.
// It is intentionally idempotent so local development can start from an empty DB.
func EnsureSchema(ctx context.Context, db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			display_name TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS documents (
			id UUID PRIMARY KEY,
			title TEXT NOT NULL,
			owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			content_snapshot BYTEA,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS document_permissions (
			document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (document_id, user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS document_updates (
			id BIGSERIAL PRIMARY KEY,
			document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
			update_data BYTEA NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_documents_owner_updated
			ON documents(owner_id, updated_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_document_permissions_user
			ON document_permissions(user_id, updated_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_document_updates_document_id
			ON document_updates(document_id, id)`,
	}

	for _, statement := range statements {
		if _, err := db.ExecContext(ctx, statement); err != nil {
			return err
		}
	}
	return nil
}
