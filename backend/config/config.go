package config

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

func ConnectDB() {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		log.Fatal("MONGO_URI no definida")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal("Error conectando a MongoDB:", err)
	}

	if err = client.Ping(ctx, nil); err != nil {
		log.Fatal("No se pudo hacer ping a MongoDB:", err)
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "tiendadube"
	}

	DB = client.Database(dbName)
	log.Println("Conectado a MongoDB:", dbName)
}
