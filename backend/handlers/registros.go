package handlers

import (
	"context"
	"net/http"
	"sort"
	"time"

	"tiendadube/config"
	"tiendadube/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func hoy() string {
	return time.Now().Format("2006-01-02")
}

// ---------- Estado del día ----------

func EstadoHoy(c *gin.Context) {
	fecha := hoy()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var apertura, cierre models.RegistroDia
	errA := config.DB.Collection("registros").FindOne(ctx, bson.M{"fecha": fecha, "tipo": "apertura"}).Decode(&apertura)
	errC := config.DB.Collection("registros").FindOne(ctx, bson.M{"fecha": fecha, "tipo": "cierre"}).Decode(&cierre)

	nRepos, _ := config.DB.Collection("registros").CountDocuments(ctx, bson.M{"fecha": fecha, "tipo": "reposicion"})

	// Si hoy no tiene apertura, buscar el día más reciente sin cerrar
	var diaPendiente string
	if errA != nil {
		findOpts := options.FindOne().SetSort(bson.D{{Key: "fecha", Value: -1}})
		var ultimaApertura models.RegistroDia
		if err := config.DB.Collection("registros").FindOne(ctx,
			bson.M{"tipo": "apertura", "fecha": bson.M{"$lt": fecha}},
			findOpts).Decode(&ultimaApertura); err == nil {
			cierreCount, _ := config.DB.Collection("registros").CountDocuments(ctx,
				bson.M{"fecha": ultimaApertura.Fecha, "tipo": "cierre"})
			if cierreCount == 0 {
				diaPendiente = ultimaApertura.Fecha
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"fecha":          fecha,
		"tiene_apertura": errA == nil,
		"tiene_cierre":   errC == nil,
		"n_reposiciones": nRepos,
		"dia_pendiente":  diaPendiente,
	})
}

// ---------- Apertura ----------

func ObtenerApertura(c *gin.Context) {
	fecha := c.Param("fecha")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var apertura models.RegistroDia
	err := config.DB.Collection("registros").FindOne(ctx, bson.M{"fecha": fecha, "tipo": "apertura"}).Decode(&apertura)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "no hay apertura para esa fecha"})
		return
	}

	productoMap, marcaMap := cargarProductosMarcas(ctx)

	// Sumar reposiciones
	reposCursor, _ := config.DB.Collection("registros").Find(ctx, bson.M{"fecha": fecha, "tipo": "reposicion"})
	var repos []models.RegistroDia
	reposCursor.All(ctx, &repos)

	repoMap := map[primitive.ObjectID]float64{}
	for _, r := range repos {
		for _, it := range r.Items {
			repoMap[it.ProductoID] += it.Cantidad
		}
	}

	type ItemDetalle struct {
		ProductoID         primitive.ObjectID `json:"producto_id"`
		Nombre             string             `json:"nombre"`
		Marca              string             `json:"marca"`
		Precio             float64            `json:"precio"`
		PrecioCompra       float64            `json:"precio_compra"`
		Tipo               string             `json:"tipo"`
		CantidadApertura   float64            `json:"cantidad_apertura"`
		CantidadReposicion float64            `json:"cantidad_reposicion"`
		CantidadTotal      float64            `json:"cantidad_total"`
	}

	items := []ItemDetalle{}
	for _, it := range apertura.Items {
		p, ok := productoMap[it.ProductoID]
		if !ok {
			continue
		}
		repo := repoMap[it.ProductoID]
		items = append(items, ItemDetalle{
			ProductoID:         it.ProductoID,
			Nombre:             p.Nombre,
			Marca:              marcaMap[p.MarcaID],
			Precio:             p.Precio,
			PrecioCompra:       p.PrecioCompra,
			Tipo:               p.Tipo,
			CantidadApertura:   it.Cantidad,
			CantidadReposicion: repo,
			CantidadTotal:      it.Cantidad + repo,
		})
	}

	c.JSON(http.StatusOK, gin.H{"fecha": fecha, "items": items})
}

func GuardarApertura(c *gin.Context) {
	fecha := hoy()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, _ := config.DB.Collection("registros").CountDocuments(ctx, bson.M{"fecha": fecha, "tipo": "apertura"})
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "ya existe apertura para hoy"})
		return
	}

	items, err := parsearItems(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	registro := models.RegistroDia{
		ID:       primitive.NewObjectID(),
		Fecha:    fecha,
		Tipo:     "apertura",
		Items:    items,
		CreadoEn: time.Now(),
	}
	_, err = config.DB.Collection("registros").InsertOne(ctx, registro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"ok": true})
}

// ---------- Reposición ----------

func GuardarReposicion(c *gin.Context) {
	fecha := hoy()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Debe existir apertura
	count, _ := config.DB.Collection("registros").CountDocuments(ctx, bson.M{"fecha": fecha, "tipo": "apertura"})
	if count == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no existe apertura para hoy"})
		return
	}

	// No puede haber cierre
	cierreCount, _ := config.DB.Collection("registros").CountDocuments(ctx, bson.M{"fecha": fecha, "tipo": "cierre"})
	if cierreCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "el día ya fue cerrado"})
		return
	}

	items, err := parsearItems(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Filtrar items con cantidad > 0
	var filtrados []models.ItemRegistro
	for _, it := range items {
		if it.Cantidad > 0 {
			filtrados = append(filtrados, it)
		}
	}
	if len(filtrados) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ingresá al menos una cantidad mayor a 0"})
		return
	}

	registro := models.RegistroDia{
		ID:       primitive.NewObjectID(),
		Fecha:    fecha,
		Tipo:     "reposicion",
		Items:    filtrados,
		CreadoEn: time.Now(),
	}
	_, err = config.DB.Collection("registros").InsertOne(ctx, registro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Reposición sale del stock (van al refrigerador desde el depósito)
	for _, it := range filtrados {
		config.DB.Collection("productos").UpdateOne(ctx,
			bson.M{"_id": it.ProductoID},
			bson.M{"$inc": bson.M{"stock": -it.Cantidad}},
		)
	}

	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": registro.ID})
}

func ObtenerReposiciones(c *gin.Context) {
	fecha := c.Param("fecha")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "creado_en", Value: 1}})
	cursor, err := config.DB.Collection("registros").Find(ctx, bson.M{"fecha": fecha, "tipo": "reposicion"}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var repos []models.RegistroDia
	cursor.All(ctx, &repos)

	productoMap, marcaMap := cargarProductosMarcas(ctx)

	type ItemRepo struct {
		ProductoID primitive.ObjectID `json:"producto_id"`
		Nombre     string             `json:"nombre"`
		Marca      string             `json:"marca"`
		Cantidad   float64            `json:"cantidad"`
	}
	type RepoDetalle struct {
		ID       primitive.ObjectID `json:"id"`
		CreadoEn time.Time          `json:"creado_en"`
		Items    []ItemRepo         `json:"items"`
	}

	resultado := []RepoDetalle{}
	for _, r := range repos {
		items := []ItemRepo{}
		for _, it := range r.Items {
			p, ok := productoMap[it.ProductoID]
			if !ok {
				continue
			}
			items = append(items, ItemRepo{
				ProductoID: it.ProductoID,
				Nombre:     p.Nombre,
				Marca:      marcaMap[p.MarcaID],
				Cantidad:   it.Cantidad,
			})
		}
		resultado = append(resultado, RepoDetalle{
			ID:       r.ID,
			CreadoEn: r.CreadoEn,
			Items:    items,
		})
	}

	c.JSON(http.StatusOK, resultado)
}

// ---------- Cierre ----------

func GuardarCierre(c *gin.Context) {
	guardarCierreConFecha(c, hoy())
}

func GuardarCierreFecha(c *gin.Context) {
	guardarCierreConFecha(c, c.Param("fecha"))
}

func guardarCierreConFecha(c *gin.Context, fecha string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var apertura models.RegistroDia
	err := config.DB.Collection("registros").FindOne(ctx, bson.M{"fecha": fecha, "tipo": "apertura"}).Decode(&apertura)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no existe apertura para ese día"})
		return
	}

	count, _ := config.DB.Collection("registros").CountDocuments(ctx, bson.M{"fecha": fecha, "tipo": "cierre"})
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "ya existe cierre para ese día"})
		return
	}

	items, err := parsearItems(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	registro := models.RegistroDia{
		ID:       primitive.NewObjectID(),
		Fecha:    fecha,
		Tipo:     "cierre",
		Items:    items,
		CreadoEn: time.Now(),
	}
	_, err = config.DB.Collection("registros").InsertOne(ctx, registro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resumen, err := calcularResumen(ctx, fecha)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, item := range resumen.Items {
		if item.Vendido > 0 {
			config.DB.Collection("productos").UpdateOne(ctx,
				bson.M{"_id": item.ProductoID},
				bson.M{"$inc": bson.M{"stock": -item.Vendido}},
			)
		}
	}

	c.JSON(http.StatusCreated, resumen)
}

// ---------- Resumen e historial ----------

func ObtenerResumen(c *gin.Context) {
	fecha := c.Param("fecha")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resumen, err := calcularResumen(ctx, fecha)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resumen)
}

func ObtenerHistorial(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "fecha", Value: -1}})
	cursor, err := config.DB.Collection("registros").Find(ctx, bson.M{"tipo": "cierre"}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	cierres := []models.RegistroDia{}
	cursor.All(ctx, &cierres)

	historial := []models.EntradaHistorial{}
	for _, cierre := range cierres {
		var apertura models.RegistroDia
		if err := config.DB.Collection("registros").FindOne(ctx, bson.M{"fecha": cierre.Fecha, "tipo": "apertura"}).Decode(&apertura); err != nil {
			continue
		}
		ganancia, totalVendido := calcularGanancia(ctx, cierre.Fecha, apertura, cierre)
		historial = append(historial, models.EntradaHistorial{
			Fecha:         cierre.Fecha,
			GananciaTotal: ganancia,
			TotalVendido:  totalVendido,
		})
	}

	c.JSON(http.StatusOK, historial)
}

// ---------- Helpers ----------

func parsearItems(c *gin.Context) ([]models.ItemRegistro, error) {
	var body struct {
		Items []struct {
			ProductoID string  `json:"producto_id"`
			Cantidad   float64 `json:"cantidad"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		return nil, err
	}

	items := []models.ItemRegistro{}
	for _, it := range body.Items {
		pid, err := primitive.ObjectIDFromHex(it.ProductoID)
		if err != nil {
			continue
		}
		items = append(items, models.ItemRegistro{ProductoID: pid, Cantidad: it.Cantidad})
	}
	return items, nil
}

func cargarProductosMarcas(ctx context.Context) (map[primitive.ObjectID]models.Producto, map[primitive.ObjectID]string) {
	cursor, _ := config.DB.Collection("productos").Find(ctx, bson.M{})
	var productos []models.Producto
	cursor.All(ctx, &productos)

	marcasCursor, _ := config.DB.Collection("marcas").Find(ctx, bson.M{})
	var marcas []models.Marca
	marcasCursor.All(ctx, &marcas)

	marcaMap := map[primitive.ObjectID]string{}
	for _, m := range marcas {
		marcaMap[m.ID] = m.Nombre
	}
	productoMap := map[primitive.ObjectID]models.Producto{}
	for _, p := range productos {
		productoMap[p.ID] = p
	}
	return productoMap, marcaMap
}

func calcularResumen(ctx context.Context, fecha string) (*models.ResumenDia, error) {
	var apertura, cierre models.RegistroDia
	errA := config.DB.Collection("registros").FindOne(ctx, bson.M{"fecha": fecha, "tipo": "apertura"}).Decode(&apertura)
	errC := config.DB.Collection("registros").FindOne(ctx, bson.M{"fecha": fecha, "tipo": "cierre"}).Decode(&cierre)

	resumen := &models.ResumenDia{
		Fecha:         fecha,
		TieneApertura: errA == nil,
		TieneCierre:   errC == nil,
		Items:         []models.ItemResumen{},
	}

	if errA != nil || errC != nil {
		return resumen, nil
	}

	productoMap, marcaMap := cargarProductosMarcas(ctx)

	// Stock disponible = apertura + reposiciones
	apMap := map[primitive.ObjectID]float64{}
	for _, it := range apertura.Items {
		apMap[it.ProductoID] = it.Cantidad
	}

	reposCursor, _ := config.DB.Collection("registros").Find(ctx, bson.M{"fecha": fecha, "tipo": "reposicion"})
	var repos []models.RegistroDia
	reposCursor.All(ctx, &repos)
	for _, r := range repos {
		for _, it := range r.Items {
			apMap[it.ProductoID] += it.Cantidad
		}
	}

	cierreMap := map[primitive.ObjectID]float64{}
	for _, it := range cierre.Items {
		cierreMap[it.ProductoID] = it.Cantidad
	}

	for _, it := range apertura.Items {
		p, ok := productoMap[it.ProductoID]
		if !ok {
			continue
		}
		disponible := apMap[it.ProductoID]
		cl := cierreMap[it.ProductoID]
		vendido := disponible - cl
		if vendido < 0 {
			vendido = 0
		}
		subtotal := vendido * p.Precio
		costo := vendido * p.PrecioCompra
		ganancia := subtotal - costo

		resumen.Items = append(resumen.Items, models.ItemResumen{
			ProductoID:   it.ProductoID,
			Nombre:       p.Nombre,
			Marca:        marcaMap[p.MarcaID],
			Tipo:         p.Tipo,
			Precio:       p.Precio,
			PrecioCompra: p.PrecioCompra,
			Stock:        p.Stock,
			Apertura:     disponible,
			Cierre:       cl,
			Vendido:      vendido,
			Subtotal:     subtotal,
			Costo:        costo,
			Ganancia:     ganancia,
		})
		resumen.Ingresos += subtotal
		resumen.CostoTotal += costo
		resumen.GananciaTotal += ganancia
		resumen.TotalVendido += vendido
	}

	sort.Slice(resumen.Items, func(i, j int) bool {
		return resumen.Items[i].Marca < resumen.Items[j].Marca
	})

	return resumen, nil
}

func calcularGanancia(ctx context.Context, fecha string, apertura, cierre models.RegistroDia) (float64, float64) {
	productoMap, _ := cargarProductosMarcas(ctx)

	apMap := map[primitive.ObjectID]float64{}
	for _, it := range apertura.Items {
		apMap[it.ProductoID] = it.Cantidad
	}

	// Sumar reposiciones
	reposCursor, _ := config.DB.Collection("registros").Find(ctx, bson.M{"fecha": fecha, "tipo": "reposicion"})
	var repos []models.RegistroDia
	reposCursor.All(ctx, &repos)
	for _, r := range repos {
		for _, it := range r.Items {
			apMap[it.ProductoID] += it.Cantidad
		}
	}

	cierreMap := map[primitive.ObjectID]float64{}
	for _, it := range cierre.Items {
		cierreMap[it.ProductoID] = it.Cantidad
	}

	var ganancia, totalVendido float64
	for pid, disponible := range apMap {
		p, ok := productoMap[pid]
		if !ok {
			continue
		}
		vendido := disponible - cierreMap[pid]
		if vendido < 0 {
			vendido = 0
		}
		subtotal := vendido * p.Precio
		costo := vendido * p.PrecioCompra
		ganancia += subtotal - costo
		totalVendido += vendido
	}
	return ganancia, totalVendido
}
