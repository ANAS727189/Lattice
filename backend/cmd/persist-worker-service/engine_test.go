package main

import (
	"context"
	"testing"
)

func TestCompactYjsUpdatesEmptyDocument(t *testing.T) {
	snapshot, err := compactYjsUpdates(context.Background(), nil, nil)
	if err != nil {
		t.Fatalf("compactYjsUpdates returned error: %v", err)
	}
	if len(snapshot) == 0 {
		t.Fatal("compactYjsUpdates returned empty snapshot")
	}
}
