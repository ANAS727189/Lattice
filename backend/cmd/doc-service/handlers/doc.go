// Package handlers contains HTTP handlers for the doc-service.
package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"lattice/backend/internal/models"
)

type DocHandler struct {
	// DB is the backing database connection.
	DB *sql.DB
}

// ErrorResponse represents a standard error payload.
type ErrorResponse struct {
	Error string `json:"error"`
}

// CreateDocumentRequest is the request payload for CreateDocument.
type CreateDocumentRequest struct {
	Title string `json:"title" example:"My first doc"`
}

// CreateDocument creates a new empty document owned by the authenticated user.
//
// @Summary Create a document
// @Tags documents
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body CreateDocumentRequest true "Document payload"
// @Success 201 {object} models.Document
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /docs [post]
func (h *DocHandler) CreateDocument(c echo.Context) error {
	// Get UserID from JWT middleware
	userID, ok := c.Get("user_id").(uuid.UUID)
	if !ok {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "missing user context"})
	}

	r := new(CreateDocumentRequest)
	if err := c.Bind(r); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
	}
	if r.Title == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "title is required"})
	}

	now := time.Now().UTC()
	doc := models.Document{
		ID:        uuid.New(),
		Title:     r.Title,
		OwnerID:   userID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// MySQL uses '?' placeholders.
	_, err := h.DB.Exec(
		`INSERT INTO documents (id, title, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		doc.ID,
		doc.Title,
		doc.OwnerID,
		doc.CreatedAt,
		doc.UpdatedAt,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not create doc"})
	}

	return c.JSON(http.StatusCreated, doc)
}

// ListDocuments lists documents owned by the authenticated user.
//
// @Summary List documents
// @Tags documents
// @Security BearerAuth
// @Produce json
// @Success 200 {array} models.Document
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /docs [get]
func (h *DocHandler) ListDocuments(c echo.Context) error {
	userID, ok := c.Get("user_id").(uuid.UUID)
	if !ok {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "missing user context"})
	}

	// If updated_at can be NULL, prefer a stable sort key.
	rows, err := h.DB.Query(
		`SELECT id, title, owner_id, created_at, updated_at
		 FROM documents
		 WHERE owner_id = ?
		 ORDER BY IFNULL(updated_at, created_at) DESC`,
		userID,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch failed"})
	}
	defer rows.Close()

	docs := make([]models.Document, 0)
	for rows.Next() {
		var doc models.Document
		var updatedAt sql.NullTime
		if err := rows.Scan(&doc.ID, &doc.Title, &doc.OwnerID, &doc.CreatedAt, &updatedAt); err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch failed"})
		}
		if updatedAt.Valid {
			doc.UpdatedAt = updatedAt.Time
		} else {
			doc.UpdatedAt = doc.CreatedAt
		}
		docs = append(docs, doc)
	}
	if err := rows.Err(); err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch failed"})
	}

	return c.JSON(http.StatusOK, docs)
}
