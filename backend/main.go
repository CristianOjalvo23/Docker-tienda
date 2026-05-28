package main

import (
	"os"

	"tiendadube/config"
	"tiendadube/handlers"
	"tiendadube/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	config.ConnectDB()

	r := gin.Default()
	r.Use(middleware.CORS())

	// Productos
	r.GET("/productos", handlers.ListarProductos)
	r.POST("/productos", handlers.CrearProducto)
	r.PUT("/productos/:id", handlers.EditarProducto)
	r.DELETE("/productos/:id", handlers.DesactivarProducto)

	// Marcas
	r.GET("/marcas", handlers.ListarMarcas)
	r.POST("/marcas", handlers.CrearMarca)

	// Registros
	r.GET("/registro/hoy", handlers.EstadoHoy)
	r.POST("/registro/apertura", handlers.GuardarApertura)
	r.POST("/registro/cierre", handlers.GuardarCierre)
	r.POST("/registro/cierre/:fecha", handlers.GuardarCierreFecha)
	r.POST("/registro/reposicion", handlers.GuardarReposicion)
	r.GET("/registro/:fecha/apertura", handlers.ObtenerApertura)
	r.GET("/registro/:fecha/reposiciones", handlers.ObtenerReposiciones)
	r.GET("/registro/:fecha", handlers.ObtenerResumen)
	r.GET("/historial", handlers.ObtenerHistorial)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
