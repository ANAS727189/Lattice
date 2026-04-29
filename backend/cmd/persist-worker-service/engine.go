package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"time"
)

type compactionRequest struct {
	Snapshot string   `json:"snapshot"`
	Updates  []string `json:"updates"`
}

type compactionResponse struct {
	Snapshot string `json:"snapshot"`
}

// StoreUpdates compacts the current Yjs snapshot with the received updates.
// If compaction fails, it stores the updates in the replay log so data is not lost.
func (w *Worker) StoreUpdates(ctx context.Context, docID string, updates [][]byte) error {
	baseSnapshot, err := w.loadSnapshot(ctx, docID)
	if err != nil {
		return err
	}
	pendingUpdates, err := w.loadReplayableUpdates(ctx, docID)
	if err != nil {
		return err
	}
	allUpdates := append(pendingUpdates, updates...)

	compacted, err := compactYjsUpdates(ctx, baseSnapshot, allUpdates)
	if err != nil {
		return w.storeReplayableUpdates(ctx, docID, updates)
	}

	tx, err := w.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE documents SET content_snapshot = $1, updated_at = NOW() WHERE id = $2`,
		compacted,
		docID,
	); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM document_updates WHERE document_id = $1`, docID); err != nil {
		return err
	}

	return tx.Commit()
}

func (w *Worker) loadSnapshot(ctx context.Context, docID string) ([]byte, error) {
	var snapshot []byte
	err := w.DB.QueryRowContext(
		ctx,
		`SELECT COALESCE(content_snapshot, ''::bytea) FROM documents WHERE id = $1`,
		docID,
	).Scan(&snapshot)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document %s not found", docID)
		}
		return nil, err
	}
	return snapshot, nil
}

func (w *Worker) loadReplayableUpdates(ctx context.Context, docID string) ([][]byte, error) {
	rows, err := w.DB.QueryContext(
		ctx,
		`SELECT update_data
		 FROM document_updates
		 WHERE document_id = $1
		 ORDER BY id ASC`,
		docID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	updates := make([][]byte, 0)
	for rows.Next() {
		var update []byte
		if err := rows.Scan(&update); err != nil {
			return nil, err
		}
		updates = append(updates, update)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return updates, nil
}

func (w *Worker) storeReplayableUpdates(ctx context.Context, docID string, updates [][]byte) error {
	tx, err := w.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, update := range updates {
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO document_updates (document_id, update_data) VALUES ($1, $2)`,
			docID,
			update,
		); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE documents SET updated_at = NOW() WHERE id = $1`,
		docID,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func compactYjsUpdates(ctx context.Context, snapshot []byte, updates [][]byte) ([]byte, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	request := compactionRequest{
		Snapshot: base64.StdEncoding.EncodeToString(snapshot),
		Updates:  make([]string, len(updates)),
	}
	for i, update := range updates {
		request.Updates[i] = base64.StdEncoding.EncodeToString(update)
	}

	payload, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	scriptPath := os.Getenv("YJS_COMPACTOR_PATH")
	if scriptPath == "" {
		scriptPath = findCompactorScript()
	}
	nodeBin := os.Getenv("NODE_BIN")
	if nodeBin == "" {
		nodeBin = "node"
	}

	cmd := exec.CommandContext(timeoutCtx, nodeBin, scriptPath)
	cmd.Stdin = bytes.NewReader(payload)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("yjs compactor failed: %w: %s", err, stderr.String())
	}

	var response compactionResponse
	if err := json.Unmarshal(stdout.Bytes(), &response); err != nil {
		return nil, err
	}
	if response.Snapshot == "" {
		return nil, fmt.Errorf("yjs compactor returned empty snapshot")
	}
	return base64.StdEncoding.DecodeString(response.Snapshot)
}

func findCompactorScript() string {
	candidates := []string{
		"tools/yjs-compactor/compact-yjs.mjs",
		"../../tools/yjs-compactor/compact-yjs.mjs",
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return candidates[0]
}
