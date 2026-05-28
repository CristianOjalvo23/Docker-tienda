package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Producto struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Nombre       string             `bson:"nombre" json:"nombre"`
	MarcaID      primitive.ObjectID `bson:"marca_id" json:"marca_id"`
	Precio       float64            `bson:"precio" json:"precio"`
	PrecioCompra float64            `bson:"precio_compra" json:"precio_compra"`
	Tipo         string             `bson:"tipo" json:"tipo"` // "externo" | "interno"
	Stock        float64            `bson:"stock" json:"stock"`
	Activo       bool               `bson:"activo" json:"activo"`
}

type ProductoConMarca struct {
	ID           primitive.ObjectID `json:"id"`
	Nombre       string             `json:"nombre"`
	Marca        string             `json:"marca"`
	Precio       float64            `json:"precio"`
	PrecioCompra float64            `json:"precio_compra"`
	Tipo         string             `json:"tipo"`
	Stock        float64            `json:"stock"`
	Activo       bool               `json:"activo"`
}

type MarcaConProductos struct {
	ID       primitive.ObjectID `json:"id"`
	Nombre   string             `json:"nombre"`
	Productos []ProductoConMarca `json:"productos"`
}
