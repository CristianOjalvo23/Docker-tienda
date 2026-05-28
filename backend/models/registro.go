package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ItemRegistro struct {
	ProductoID primitive.ObjectID `bson:"producto_id" json:"producto_id"`
	Cantidad   float64            `bson:"cantidad" json:"cantidad"`
}

type RegistroDia struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Fecha    string             `bson:"fecha" json:"fecha"` // YYYY-MM-DD
	Tipo     string             `bson:"tipo" json:"tipo"`   // apertura | cierre | reposicion
	Items    []ItemRegistro     `bson:"items" json:"items"`
	CreadoEn time.Time          `bson:"creado_en,omitempty" json:"creado_en,omitempty"`
}

type ItemResumen struct {
	ProductoID   primitive.ObjectID `json:"producto_id"`
	Nombre       string             `json:"nombre"`
	Marca        string             `json:"marca"`
	Tipo         string             `json:"tipo"`
	Precio       float64            `json:"precio"`
	PrecioCompra float64            `json:"precio_compra"`
	Stock        float64            `json:"stock"`
	Apertura     float64            `json:"apertura"`
	Cierre       float64            `json:"cierre"`
	Vendido      float64            `json:"vendido"`
	Subtotal     float64            `json:"subtotal"`
	Costo        float64            `json:"costo"`
	Ganancia     float64            `json:"ganancia"`
}

type ResumenDia struct {
	Fecha         string        `json:"fecha"`
	TieneApertura bool          `json:"tiene_apertura"`
	TieneCierre   bool          `json:"tiene_cierre"`
	TotalVendido  float64       `json:"total_vendido"`
	Ingresos      float64       `json:"ingresos"`
	CostoTotal    float64       `json:"costo_total"`
	GananciaTotal float64       `json:"ganancia_total"` // ganancia neta = ingresos - costo_total
	Items         []ItemResumen `json:"items"`
}

type EntradaHistorial struct {
	Fecha         string  `json:"fecha"`
	GananciaTotal float64 `json:"ganancia_total"` // ganancia neta
	TotalVendido  float64 `json:"total_vendido"`
}
