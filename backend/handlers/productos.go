package handlers

import (
	"context"
	"net/http"
	"time"

	"tiendadube/config"
	"tiendadube/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func ListarProductos(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Obtener todas las marcas
	marcasCursor, err := config.DB.Collection("marcas").Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	marcas := []models.Marca{}
	if err = marcasCursor.All(ctx, &marcas); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Obtener todos los productos activos
	cursor, err := config.DB.Collection("productos").Find(ctx, bson.M{"activo": true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	productos := []models.Producto{}
	if err = cursor.All(ctx, &productos); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Armar mapa marca_id -> nombre
	marcaMap := map[primitive.ObjectID]models.Marca{}
	for _, m := range marcas {
		marcaMap[m.ID] = m
	}

	// Agrupar por marca
	grupoMap := map[primitive.ObjectID]*models.MarcaConProductos{}
	orden := []primitive.ObjectID{}
	for _, p := range productos {
		if _, ok := grupoMap[p.MarcaID]; !ok {
			marcaNombre := ""
			if m, ok2 := marcaMap[p.MarcaID]; ok2 {
				marcaNombre = m.Nombre
			}
			grupoMap[p.MarcaID] = &models.MarcaConProductos{
				ID:        p.MarcaID,
				Nombre:    marcaNombre,
				Productos: []models.ProductoConMarca{},
			}
			orden = append(orden, p.MarcaID)
		}
		marcaNombre := ""
		if m, ok := marcaMap[p.MarcaID]; ok {
			marcaNombre = m.Nombre
		}
		grupoMap[p.MarcaID].Productos = append(grupoMap[p.MarcaID].Productos, models.ProductoConMarca{
			ID:           p.ID,
			Nombre:       p.Nombre,
			Marca:        marcaNombre,
			Precio:       p.Precio,
			PrecioCompra: p.PrecioCompra,
			Tipo:         p.Tipo,
			Stock:        p.Stock,
			Activo:       p.Activo,
		})
	}

	resultado := []models.MarcaConProductos{}
	for _, id := range orden {
		resultado = append(resultado, *grupoMap[id])
	}
	if resultado == nil {
		resultado = []models.MarcaConProductos{}
	}

	c.JSON(http.StatusOK, resultado)
}

func CrearProducto(c *gin.Context) {
	var body struct {
		Nombre       string  `json:"nombre" binding:"required"`
		MarcaID      string  `json:"marca_id" binding:"required"`
		Precio       float64 `json:"precio" binding:"required"`
		PrecioCompra float64 `json:"precio_compra"`
		Stock        float64 `json:"stock"`
		Tipo         string  `json:"tipo"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Tipo == "" {
		body.Tipo = "externo"
	}

	marcaID, err := primitive.ObjectIDFromHex(body.MarcaID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "marca_id inválido"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Verificar que la marca existe
	var marca models.Marca
	err = config.DB.Collection("marcas").FindOne(ctx, bson.M{"_id": marcaID}).Decode(&marca)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusBadRequest, gin.H{"error": "marca no encontrada"})
		return
	}

	producto := models.Producto{
		ID:           primitive.NewObjectID(),
		Nombre:       body.Nombre,
		MarcaID:      marcaID,
		Precio:       body.Precio,
		PrecioCompra: body.PrecioCompra,
		Tipo:         body.Tipo,
		Stock:        body.Stock,
		Activo:       true,
	}

	_, err = config.DB.Collection("productos").InsertOne(ctx, producto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, producto)
}

func EditarProducto(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	var body struct {
		Nombre       string   `json:"nombre"`
		Precio       *float64 `json:"precio"`
		PrecioCompra *float64 `json:"precio_compra"`
		Stock        *float64 `json:"stock"`
		Tipo         string   `json:"tipo"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	update := bson.M{}
	if body.Nombre != "" {
		update["nombre"] = body.Nombre
	}
	if body.Precio != nil {
		update["precio"] = *body.Precio
	}
	if body.PrecioCompra != nil {
		update["precio_compra"] = *body.PrecioCompra
	}
	if body.Stock != nil {
		update["stock"] = *body.Stock
	}
	if body.Tipo != "" {
		update["tipo"] = body.Tipo
	}
	if len(update) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nada para actualizar"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := config.DB.Collection("productos").UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if res.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "producto no encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func DesactivarProducto(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := config.DB.Collection("productos").UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"activo": false}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if res.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "producto no encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func ListarMarcas(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := config.DB.Collection("marcas").Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	marcas := []models.Marca{}
	if err = cursor.All(ctx, &marcas); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, marcas)
}

func CrearMarca(c *gin.Context) {
	var body struct {
		Nombre string `json:"nombre" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	marca := models.Marca{
		ID:     primitive.NewObjectID(),
		Nombre: body.Nombre,
	}
	_, err := config.DB.Collection("marcas").InsertOne(ctx, marca)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, marca)
}
