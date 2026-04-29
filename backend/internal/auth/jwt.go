// Package auth provides JWT helpers used for authenticating users.
//
// It is designed to be used by HTTP middleware (see internal/middleware) and
// handlers that need to mint or validate access tokens.
package auth

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// jwtSecret is the HMAC secret used to sign and validate JWT tokens.
//
// It is sourced from the JWT_SECRET environment variable at process start.
var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

// Claims is the JWT claims payload used by this application.
//
// It carries the authenticated user's ID along with standard registered claims
// such as expiry.
type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateToken creates and signs a JWT for the given user.
//
// The token is signed with HS256 and expires after 24 hours.
func GenerateToken(userID uuid.UUID) (string, error) {
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateToken parses a JWT and validates its signature and expiry.
//
// On success it returns the application claims.
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, err
}
