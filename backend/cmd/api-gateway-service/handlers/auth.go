// Package handlers contains HTTP handlers for the api-gateway-service.
package handlers

import (
	"database/sql"
	"net/http"
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
