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
	"fmt"
	"lattice/backend/cmd/api-gateway-service/handlers"
	"lattice/backend/internal/database"
	"net/http"

	"github.com/labstack/echo/v4"
	echoSwagger "github.com/swaggo/echo-swagger"

	_ "lattice/backend/cmd/api-gateway-service/docs"
)

// main configures routes and starts the Echo HTTP server.
func main() {
	e := echo.New()
	db, err := database.NewMySQLDB()
	if err != nil {
		e.Logger.Fatal(err)
	}
	defer db.Close()
	h := &handlers.AuthHandler{DB: db}

	e.POST("/register", h.Register)
	e.POST("/login", h.Login)

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
