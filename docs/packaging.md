# Lumos-DB Packaging and Build Guide

This document explains how to build, test, and package the Lumos-DB project using the provided justfile commands.

## Prerequisites

To use the justfile commands, you need to install:

1. [just](https://github.com/casey/just) - A handy command runner
2. Go 1.22 or later
3. Docker (for container-related commands)

## Installing Just

### On macOS
```bash
brew install just
```

### On Linux
```bash
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin
```

### On Windows
```powershell
choco install just
```

## Available Commands

Run `just` or `just --list` to see all available commands:

```
Available recipes:
    backup DB_PATH="data/lumos.db" # Run a database backup
    build                          # Build and test all components
    build-server                   # Build the server binary
    clean                          # Clean build artifacts
    default                        # Default command that shows help
    deps                           # Install dependencies
    dev                            # Run the server in development mode with hot reload
    docker-build VERSION="dev"     # Build docker image
    docker-multiplatform VERSION="dev" # Build multi-platform docker images
    docker-run VERSION="dev"       # Run Docker container
    format                         # Format the codebase
    github-release VERSION         # Generate release for GitHub
    lint                           # Lint the codebase
    migrate                        # Run database migration
    new-example NAME               # Create a new example application
    package VERSION="dev"          # Package the project into a distributable archive
    setup-dev                      # Set up development environment
    test                           # Run tests for all components
    test-server                    # Run tests for the server code
```

## Common Workflows

### Development Setup

To set up your development environment:

```bash
just setup-dev
just deps
```

### Development Cycle

During development, you can use:

```bash
just dev       # Run server with hot reload
just lint      # Check for issues
just format    # Format the code
just test      # Run tests
```

### Building and Packaging

To build and package Lumos-DB:

```bash
just build                # Just build the binaries
just package              # Package as lumos-db-dev.tar.gz and lumos-db-dev.zip
just package 1.0.0        # Package with specific version number
```

The packaged files will be available in the `dist/` directory.

### Docker Operations

To build and run with Docker:

```bash
just docker-build         # Build Docker image tagged as lumos-db:dev
just docker-build 1.0.0   # Build Docker image with specific version
just docker-run           # Run the Docker container
```

For multi-platform builds:

```bash
just docker-multiplatform 1.0.0  # Build for multiple architectures
```

### Releasing

To create a GitHub release:

```bash
just github-release 1.0.0  # Package and create a GitHub release
```

This requires the GitHub CLI to be installed and authenticated.

## Package Contents

The packaged archives contain:

- Server binaries
- Configuration files
- Documentation
- License and README files

## Creating Example Applications

To create a new example application:

```bash
just new-example my-analytics-app
```

This will create a new directory `examples/my-analytics-app` with template files ready for you to customize.

## Cleaning Up

To clean build artifacts:

```bash
just clean
```

## Docker Images

The Docker image is built using a multi-stage build process that:

1. Compiles the Go code in a builder stage
2. Creates a minimal runtime image with only necessary components
3. Sets up appropriate environment variables

The resulting image is approximately 20-30MB in size and runs with minimal privileges.

## Continuous Integration

The justfile commands are designed to be used in CI/CD pipelines. A typical CI workflow might use:

```bash
just deps
just lint
just test
just package $VERSION
``` 