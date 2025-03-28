package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/lumos-db/server/internal/api/rest"
)

func main() {
	// Create and configure the server
	config := rest.DefaultConfig()

	// You can override config from environment variables here
	// Example:
	// config.LLMConfig.APIKey = os.Getenv("LLM_API_KEY")
	// config.LLMConfig.EndpointURL = os.Getenv("LLM_ENDPOINT_URL")

	server := rest.NewServer(config)

	// Start the server in a goroutine
	go func() {
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Create a deadline to wait for
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Gracefully shutdown the server
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown failed: %v", err)
	}

	log.Println("Server exited properly")
}
