FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy Go module files
COPY server/go.mod server/go.sum ./server/
RUN cd server && go mod download

# Copy source code
COPY server/ ./server/

# Build the binary
RUN cd server && go build -o /app/bin/lumos-server ./cmd/lumos-server

# Create the final lightweight image
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Copy the binary from the builder stage
COPY --from=builder /app/bin/lumos-server /app/bin/lumos-server

# Copy configuration files
COPY configs /app/configs

# Create directory for data
RUN mkdir -p /app/data

# Set environment variables
ENV GIN_MODE=release
ENV LUMOS_ENV=production
ENV LUMOS_DATA_DIR=/app/data

# Expose the server port
EXPOSE 8080

# Set the entrypoint
ENTRYPOINT ["/app/bin/lumos-server"] 