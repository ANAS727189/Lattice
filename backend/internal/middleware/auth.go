// Package middleware contains HTTP middleware used by backend services.
package middleware

import (
	"lattice/backend/internal/auth"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// JWTMiddleware validates a Bearer token from the Authorization header.
//
// On success it stores the authenticated user's ID into the Echo context under
// the key "user_id".
func JWTMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Missing token"})
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := auth.ValidateToken(token)
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid token"})
		}

		// Store user_id in context for handlers to use
		c.Set("user_id", claims.UserID)
		return next(c)
	}
}
