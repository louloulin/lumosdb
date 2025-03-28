# Lumos-DB Justfile
# This file provides a unified command interface for building, testing, and packaging Lumos-DB

# Default command that shows help
default:
    @just --list

# Build the server binary
build-server:
    @echo "Building Lumos-DB server..."
    cd server && go build -o bin/lumos-server ./cmd/lumos-server

# Run tests for the server code
test-server:
    @echo "Running server tests..."
    cd server && go test -v ./internal/...

# Run database migration
migrate:
    @echo "Running database migrations..."
    cd server && go run ./cmd/migrations

# Build and test all components
build: build-server
    @echo "Build completed successfully!"

test: test-server
    @echo "All tests completed successfully!"

# Package the project into a distributable archive
package VERSION="dev":
    @echo "Packaging Lumos-DB v{{VERSION}}..."
    mkdir -p dist
    # Build binaries
    just build
    # Create directory structure for package
    mkdir -p packaging/lumos-db-{{VERSION}}
    cp -r server/bin/* packaging/lumos-db-{{VERSION}}/
    cp -r configs packaging/lumos-db-{{VERSION}}/
    cp -r README.md packaging/lumos-db-{{VERSION}}/
    cp -r LICENSE packaging/lumos-db-{{VERSION}}/
    cp -r docs packaging/lumos-db-{{VERSION}}/
    # Create tarball
    cd packaging && tar -czf ../dist/lumos-db-{{VERSION}}.tar.gz lumos-db-{{VERSION}}
    # Create zip archive
    cd packaging && zip -r ../dist/lumos-db-{{VERSION}}.zip lumos-db-{{VERSION}}
    # Clean up
    rm -rf packaging
    @echo "Package created at dist/lumos-db-{{VERSION}}.tar.gz and dist/lumos-db-{{VERSION}}.zip"

# Clean build artifacts
clean:
    @echo "Cleaning build artifacts..."
    rm -rf server/bin
    rm -rf dist
    rm -rf packaging
    @echo "Clean completed successfully!"

# Set up development environment
setup-dev:
    @echo "Setting up development environment..."
    go install github.com/cosmtrek/air@latest
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
    @echo "Development environment setup completed!"

# Run the server in development mode with hot reload
dev:
    @echo "Starting server in development mode..."
    cd server && air

# Lint the codebase
lint:
    @echo "Linting Go code..."
    cd server && golangci-lint run ./...

# Format the codebase
format:
    @echo "Formatting Go code..."
    cd server && go fmt ./...

# Run a database backup
backup DB_PATH="data/lumos.db":
    @echo "Backing up database from {{DB_PATH}}..."
    mkdir -p backups
    cp {{DB_PATH}} backups/lumos-$(date +%Y%m%d%H%M%S).db
    @echo "Backup completed successfully!"

# Create a new example application
new-example NAME:
    @echo "Creating new example: {{NAME}}..."
    mkdir -p examples/{{NAME}}
    cp -r examples/template/* examples/{{NAME}}/
    @echo "Example created at examples/{{NAME}}/"

# Install dependencies
deps:
    @echo "Installing dependencies..."
    cd server && go mod download
    @echo "Dependencies installed successfully!"

# Build docker image
docker-build VERSION="dev":
    @echo "Building Docker image v{{VERSION}}..."
    docker build -t lumos-db:{{VERSION}} .
    @echo "Docker image built successfully!"

# Run Docker container
docker-run VERSION="dev":
    @echo "Running Docker container..."
    docker run -p 8080:8080 -v $(pwd)/data:/app/data lumos-db:{{VERSION}}

# Build multi-platform docker images
docker-multiplatform VERSION="dev":
    @echo "Building multi-platform Docker images v{{VERSION}}..."
    docker buildx build --platform linux/amd64,linux/arm64 -t lumos-db:{{VERSION}} --push .
    @echo "Multi-platform Docker images built successfully!"

# Generate release for GitHub
github-release VERSION:
    @echo "Creating GitHub release v{{VERSION}}..."
    just package {{VERSION}}
    gh release create v{{VERSION}} --title "Lumos-DB v{{VERSION}}" --notes-file CHANGELOG.md dist/*
    @echo "GitHub release created successfully!" 