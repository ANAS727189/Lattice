// Command api-gateway-service starts the HTTP API gateway.
//
// It exposes auth endpoints and a health check, and wires shared infrastructure
// like the database connection.
//
// Swagger/OpenAPI:
// @title Lattice API Gateway
// @version 1.0
// @description Authentication endpoints and a health check.
// @BasePath /
// @schemes http
package main

import (
	"context"
	"fmt"
	"lattice/backend/cmd/api-gateway-service/handlers"
	"lattice/backend/internal/database"
	appmiddleware "lattice/backend/internal/middleware"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"

	_ "lattice/backend/cmd/api-gateway-service/docs"
)

// main configures routes and starts the Echo HTTP server.
func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found (or error loading it). Relying on system environment variables.")
	}
	e := echo.New()

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedOrigins(),
		AllowMethods: []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	db, err := database.NewPostgresDB()
	if err != nil {
		e.Logger.Fatal(err)
	}
	defer db.Close()
	if err := database.EnsureSchema(context.Background(), db); err != nil {
		e.Logger.Fatal(err)
	}
	h := &handlers.AuthHandler{DB: db}

	e.POST("/register", h.Register)
	e.POST("/login", h.Login)
	e.GET("/me", h.Me, appmiddleware.JWTMiddleware)
	e.GET("/users/search", h.SearchUsers, appmiddleware.JWTMiddleware)

	// Swagger UI: /swagger/index.html
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status":  "ok",
			"message": fmt.Sprintf("API Gateway is healthy at %s", c.Request().Host),
		})
	})

	if err := e.Start(":8080"); err != nil {
		e.Logger.Error(err.Error())
	}
}

func allowedOrigins() []string {
	value := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if value == "" {
		return []string{"http://localhost:3000"}
	}
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	if len(origins) == 0 {
		return []string{"http://localhost:3000"}
	}
	return origins
}
