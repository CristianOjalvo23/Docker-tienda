package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Marca struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Nombre string             `bson:"nombre" json:"nombre"`
}
