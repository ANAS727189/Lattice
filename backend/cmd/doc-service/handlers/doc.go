// Package handlers contains HTTP handlers for the doc-service.
package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"lattice/backend/internal/models"
)

var errNoAccess = errors.New("document access denied")

const (
	roleOwner  = "owner"
	roleEditor = "editor"
	roleViewer = "viewer"
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

// UpdateDocumentRequest is the request payload for UpdateDocument.
type UpdateDocumentRequest struct {
	Title string `json:"title" example:"Renamed doc"`
}

// PermissionRequest is the request payload for UpsertPermission.
type PermissionRequest struct {
	Role string `json:"role" example:"editor"`
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

	err := h.DB.QueryRowContext(
		c.Request().Context(),
		`INSERT INTO documents (id, title, owner_id, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, title, owner_id, created_at, updated_at`,
		doc.ID,
		doc.Title,
		doc.OwnerID,
		doc.CreatedAt,
		doc.UpdatedAt,
	).Scan(&doc.ID, &doc.Title, &doc.OwnerID, &doc.CreatedAt, &doc.UpdatedAt)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not create doc"})
	}

	return c.JSON(http.StatusCreated, doc)
}

// ListDocuments lists documents owned by or shared with the authenticated user.
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

	rows, err := h.DB.QueryContext(
		c.Request().Context(),
		`SELECT d.id, d.title, d.owner_id, d.created_at, d.updated_at
		 FROM documents d
		 LEFT JOIN document_permissions p
		   ON p.document_id = d.id AND p.user_id = $1
		 WHERE d.owner_id = $1 OR p.user_id = $1
		 ORDER BY COALESCE(d.updated_at, d.created_at) DESC`,
		userID,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch failed"})
	}
	defer rows.Close()

	docs := make([]models.Document, 0)
	for rows.Next() {
		doc, err := scanDocument(rows)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch failed"})
		}
		docs = append(docs, doc)
	}
	if err := rows.Err(); err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch failed"})
	}

	return c.JSON(http.StatusOK, docs)
}

// GetDocument returns one document if the user has access.
func (h *DocHandler) GetDocument(c echo.Context) error {
	userID, docID, ok := parseUserAndDoc(c)
	if !ok {
		return parseError(c)
	}

	role, err := h.roleForDocument(c, userID, docID)
	if err != nil {
		return roleError(c, err)
	}

	var doc models.Document
	var snapshot []byte
	err = h.DB.QueryRowContext(
		c.Request().Context(),
		`SELECT id, title, owner_id, COALESCE(content_snapshot, ''::bytea), created_at, updated_at
		 FROM documents
		 WHERE id = $1`,
		docID,
	).Scan(&doc.ID, &doc.Title, &doc.OwnerID, &snapshot, &doc.CreatedAt, &doc.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, ErrorResponse{Error: "document not found"})
		}
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch failed"})
	}
	doc.ContentSnapshot = snapshot

	return c.JSON(http.StatusOK, map[string]interface{}{
		"document": doc,
		"role":     role,
	})
}

// UpdateDocument renames a document if the user is the owner or an editor.
func (h *DocHandler) UpdateDocument(c echo.Context) error {
	userID, docID, ok := parseUserAndDoc(c)
	if !ok {
		return parseError(c)
	}

	role, err := h.roleForDocument(c, userID, docID)
	if err != nil {
		return roleError(c, err)
	}
	if role != roleOwner && role != roleEditor {
		return c.JSON(http.StatusForbidden, ErrorResponse{Error: "editor access required"})
	}

	r := new(UpdateDocumentRequest)
	if err := c.Bind(r); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
	}
	if r.Title == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "title is required"})
	}

	var doc models.Document
	err = h.DB.QueryRowContext(
		c.Request().Context(),
		`UPDATE documents
		 SET title = $1, updated_at = NOW()
		 WHERE id = $2
		 RETURNING id, title, owner_id, created_at, updated_at`,
		r.Title,
		docID,
	).Scan(&doc.ID, &doc.Title, &doc.OwnerID, &doc.CreatedAt, &doc.UpdatedAt)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not update doc"})
	}

	return c.JSON(http.StatusOK, doc)
}

// DeleteDocument deletes a document. Only the owner can delete it.
func (h *DocHandler) DeleteDocument(c echo.Context) error {
	userID, docID, ok := parseUserAndDoc(c)
	if !ok {
		return parseError(c)
	}

	role, err := h.roleForDocument(c, userID, docID)
	if err != nil {
		return roleError(c, err)
	}
	if role != roleOwner {
		return c.JSON(http.StatusForbidden, ErrorResponse{Error: "owner access required"})
	}

	_, err = h.DB.ExecContext(c.Request().Context(), `DELETE FROM documents WHERE id = $1`, docID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not delete doc"})
	}
	return c.NoContent(http.StatusNoContent)
}

// UpsertPermission grants or updates a user's role for a document.
func (h *DocHandler) UpsertPermission(c echo.Context) error {
	userID, docID, ok := parseUserAndDoc(c)
	if !ok {
		return parseError(c)
	}
	targetID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid user id"})
	}

	role, err := h.roleForDocument(c, userID, docID)
	if err != nil {
		return roleError(c, err)
	}
	if role != roleOwner {
		return c.JSON(http.StatusForbidden, ErrorResponse{Error: "owner access required"})
	}
	if targetID == userID {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "owner role is implicit"})
	}

	r := new(PermissionRequest)
	if err := c.Bind(r); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
	}
	if r.Role != roleViewer && r.Role != roleEditor {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "role must be viewer or editor"})
	}

	permission := models.DocumentPermission{
		DocumentID: docID,
		UserID:     targetID,
		Role:       r.Role,
	}
	err = h.DB.QueryRowContext(
		c.Request().Context(),
		`INSERT INTO document_permissions (document_id, user_id, role)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (document_id, user_id)
		 DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
		 RETURNING document_id, user_id, role`,
		permission.DocumentID,
		permission.UserID,
		permission.Role,
	).Scan(&permission.DocumentID, &permission.UserID, &permission.Role)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not save permission"})
	}

	return c.JSON(http.StatusOK, permission)
}

// DeletePermission removes a user's explicit access to a document.
func (h *DocHandler) DeletePermission(c echo.Context) error {
	userID, docID, ok := parseUserAndDoc(c)
	if !ok {
		return parseError(c)
	}
	targetID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid user id"})
	}

	role, err := h.roleForDocument(c, userID, docID)
	if err != nil {
		return roleError(c, err)
	}
	if role != roleOwner {
		return c.JSON(http.StatusForbidden, ErrorResponse{Error: "owner access required"})
	}

	_, err = h.DB.ExecContext(
		c.Request().Context(),
		`DELETE FROM document_permissions WHERE document_id = $1 AND user_id = $2`,
		docID,
		targetID,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not delete permission"})
	}
	return c.NoContent(http.StatusNoContent)
}

func parseUserAndDoc(c echo.Context) (uuid.UUID, uuid.UUID, bool) {
	userID, ok := c.Get("user_id").(uuid.UUID)
	if !ok {
		return uuid.Nil, uuid.Nil, false
	}
	docID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return userID, uuid.Nil, false
	}
	return userID, docID, true
}

func parseError(c echo.Context) error {
	if _, ok := c.Get("user_id").(uuid.UUID); !ok {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "missing user context"})
	}
	return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid document id"})
}

func (h *DocHandler) roleForDocument(c echo.Context, userID, docID uuid.UUID) (string, error) {
	var ownerID uuid.UUID
	err := h.DB.QueryRowContext(
		c.Request().Context(),
		`SELECT owner_id FROM documents WHERE id = $1`,
		docID,
	).Scan(&ownerID)
	if err != nil {
		return "", err
	}
	if ownerID == userID {
		return roleOwner, nil
	}

	var role string
	err = h.DB.QueryRowContext(
		c.Request().Context(),
		`SELECT role FROM document_permissions WHERE document_id = $1 AND user_id = $2`,
		docID,
		userID,
	).Scan(&role)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", errNoAccess
		}
		return "", err
	}
	return role, nil
}

func roleError(c echo.Context, err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "document not found"})
	}
	if errors.Is(err, errNoAccess) {
		return c.JSON(http.StatusForbidden, ErrorResponse{Error: "document access denied"})
	}
	return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch failed"})
}

type documentScanner interface {
	Scan(dest ...interface{}) error
}

func scanDocument(row documentScanner) (models.Document, error) {
	var doc models.Document
	err := row.Scan(&doc.ID, &doc.Title, &doc.OwnerID, &doc.CreatedAt, &doc.UpdatedAt)
	return doc, err
}
