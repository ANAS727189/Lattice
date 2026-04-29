// Command doc-service starts the document HTTP service.
//
// It provides endpoints for creating and listing documents and requires JWT
// authentication for access.
//
// Swagger/OpenAPI:
// @title Lattice Document Service
// @version 1.0
// @description Document creation and listing APIs.
// @BasePath /
// @schemes http
//
// Security:
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Use "Bearer <token>"
package main

import (
	"lattice/backend/cmd/doc-service/handlers"
	"lattice/backend/internal/database"
	"lattice/backend/internal/middleware"

	"github.com/labstack/echo/v4"
	echoSwagger "github.com/swaggo/echo-swagger"

	_ "lattice/backend/cmd/doc-service/docs"
)

// main configures routes and starts the Echo HTTP server.
func main() {
	e := echo.New()
	db, err := database.NewMySQLDB()
	if err != nil {
		e.Logger.Fatal(err)
	}
	defer db.Close()

	h := &handlers.DocHandler{DB: db}

	// Group routes that require authentication
	g := e.Group("/docs")
	g.Use(middleware.JWTMiddleware)

	g.POST("", h.CreateDocument)
	g.GET("", h.ListDocuments)

	// Swagger UI: /swagger/index.html
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	e.Logger.Fatal(e.Start(":8081"))
}
