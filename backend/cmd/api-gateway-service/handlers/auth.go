// Package handlers contains HTTP handlers for the api-gateway-service.
package handlers

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"lattice/backend/internal/auth"
	"lattice/backend/internal/models"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles authentication-related endpoints.
type AuthHandler struct {
	// DB is the backing database connection.
	DB *sql.DB
}

// Me returns the authenticated user's profile.
func (h *AuthHandler) Me(c echo.Context) error {
	userID, ok := c.Get("user_id").(uuid.UUID)
	if !ok {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "missing user context"})
	}

	var user models.User
	err := h.DB.QueryRowContext(
		c.Request().Context(),
		`SELECT id, email, display_name, created_at FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.DisplayName, &user.CreatedAt)
	if err != nil {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "user not found"})
	}
	return c.JSON(http.StatusOK, user)
}

// UpdateMe updates the authenticated user's profile.
//
// Currently supports updating the display name.
func (h *AuthHandler) UpdateMe(c echo.Context) error {
	userID, ok := c.Get("user_id").(uuid.UUID)
	if !ok {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "missing user context"})
	}

	r := new(UpdateMeRequest)
	if err := c.Bind(r); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
	}

	displayName := strings.TrimSpace(r.DisplayName)
	if displayName == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "display name is required"})
	}
	if len(displayName) > 80 {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "display name is too long"})
	}

	var user models.User
	err := h.DB.QueryRowContext(
		c.Request().Context(),
		`UPDATE users
		 SET display_name = $1
		 WHERE id = $2
		 RETURNING id, email, display_name, created_at`,
		displayName,
		userID,
	).Scan(&user.ID, &user.Email, &user.DisplayName, &user.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, ErrorResponse{Error: "user not found"})
		}
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not update profile"})
	}

	return c.JSON(http.StatusOK, user)
}

// SearchUsers returns users whose email or display name matches the query.
func (h *AuthHandler) SearchUsers(c echo.Context) error {
	if _, ok := c.Get("user_id").(uuid.UUID); !ok {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "missing user context"})
	}

	query := strings.TrimSpace(c.QueryParam("q"))
	if len(query) < 2 {
		return c.JSON(http.StatusOK, []models.User{})
	}

	rows, err := h.DB.QueryContext(
		c.Request().Context(),
		`SELECT id, email, display_name
		 FROM users
		 WHERE email ILIKE $1 OR display_name ILIKE $1
		 ORDER BY display_name ASC
		 LIMIT 8`,
		"%"+query+"%",
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "search failed"})
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Email, &user.DisplayName); err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "search failed"})
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "search failed"})
	}
	return c.JSON(http.StatusOK, users)
}

// ErrorResponse represents a standard error payload.
type ErrorResponse struct {
	Error string `json:"error"`
}

// RegisterRequest is the request payload for Register.
type RegisterRequest struct {
	Email    string `json:"email" example:"user@example.com"`
	Password string `json:"password" example:"correct-horse-battery-staple"`
	Name     string `json:"name" example:"Ada Lovelace"`
}

// LoginRequest is the request payload for Login.
type LoginRequest struct {
	Email    string `json:"email" example:"user@example.com"`
	Password string `json:"password" example:"correct-horse-battery-staple"`
}

// TokenResponse is returned on successful login.
type TokenResponse struct {
	Token string `json:"token"`
}

// UpdateMeRequest is the request payload for UpdateMe.
type UpdateMeRequest struct {
	DisplayName string `json:"display_name" example:"Ada Lovelace"`
}

// Register creates a new user account.
//
// @Summary Register a new user
// @Tags auth
// @Accept json
// @Produce json
// @Param body body RegisterRequest true "Registration payload"
// @Success 201 {object} models.User
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /register [post]
func (h *AuthHandler) Register(c echo.Context) error {
	r := new(RegisterRequest)
	if err := c.Bind(r); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
	}
	if r.Email == "" || r.Password == "" || r.Name == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "email, password and name are required"})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(r.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not hash password"})
	}

	user := models.User{
		ID:          uuid.New(),
		Email:       r.Email,
		DisplayName: r.Name,
		CreatedAt:   time.Now().UTC(),
	}
	err = h.DB.QueryRow(
		`INSERT INTO users (id, email, password_hash, display_name, created_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, email, display_name, created_at`,
		user.ID,
		user.Email,
		string(hashed),
		user.DisplayName,
		user.CreatedAt,
	).Scan(&user.ID, &user.Email, &user.DisplayName, &user.CreatedAt)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "user already exists"})
	}

	return c.JSON(http.StatusCreated, user)
}

// Login validates credentials and returns a signed JWT.
//
// @Summary Login a user
// @Tags auth
// @Accept json
// @Produce json
// @Param body body LoginRequest true "Login payload"
// @Success 200 {object} TokenResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /login [post]
func (h *AuthHandler) Login(c echo.Context) error {
	r := new(LoginRequest)
	if err := c.Bind(r); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
	}

	var user models.User
	row := h.DB.QueryRow(
		`SELECT id, email, password_hash, display_name FROM users WHERE email = $1 LIMIT 1`,
		r.Email,
	)
	if err := row.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName); err != nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Invalid credentials"})
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(r.Password)) != nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Invalid credentials"})
	}

	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "could not generate token"})
	}
	return c.JSON(http.StatusOK, TokenResponse{Token: token})
}
