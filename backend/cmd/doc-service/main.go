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
	"context"
	"lattice/backend/cmd/doc-service/handlers"
	"lattice/backend/internal/database"
	appmiddleware "lattice/backend/internal/middleware"
	"log"

	"net/http"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"

	_ "lattice/backend/cmd/doc-service/docs"
)

// main configures routes and starts the Echo HTTP server.
func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found (or error loading it). Relying on system environment variables.")
	}
	e := echo.New()

	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000"},
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

	h := &handlers.DocHandler{DB: db}

	// Group routes that require authentication
	g := e.Group("/docs")
	g.Use(appmiddleware.JWTMiddleware)

	g.POST("", h.CreateDocument)
	g.GET("", h.ListDocuments)
	g.GET("/:id", h.GetDocument)
	g.PATCH("/:id", h.UpdateDocument)
	g.DELETE("/:id", h.DeleteDocument)
	g.GET("/:id/permissions", h.ListPermissions)
	g.PUT("/:id/permissions/:user_id", h.UpsertPermission)
	g.DELETE("/:id/permissions/:user_id", h.DeletePermission)

	// Swagger UI: /swagger/index.html
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	e.Logger.Fatal(e.Start(":8081"))
}
