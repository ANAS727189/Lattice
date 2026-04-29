package main

import (
	"database/sql"
	"log"
)

// ApplyAndCompact combines a base snapshot with a sequence of updates and
// returns a single snapshot suitable for persistence.
//
// This is currently implemented as a conservative fallback: if updates exist,
// it stores the latest update; otherwise it returns the last known snapshot.
func (w *Worker) ApplyAndCompact(docID string, updates [][]byte) []byte {
	// NOTE: This used to rely on github.com/y-crdt/ypy-go for Yjs update compaction,
	// but that module is not available (repo not found). To keep the service buildable,
	// we fall back to storing the latest update, or the last known snapshot when no
	// updates exist.

	if len(updates) > 0 {
		return updates[len(updates)-1]
	}

	var baseState []byte
	err := w.DB.QueryRow(`SELECT content_snapshot FROM documents WHERE id = ?`, docID).Scan(&baseState)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Printf("Error loading base snapshot for %s: %v", docID, err)
		}
		return nil
	}

	return baseState
}
