# PostgreSQL WASM Plugin Tester

This is a test program for the PostgreSQL WebAssembly plugin in Lumos DB. It allows you to test the extract, transform, and load functions of the plugin without needing to set up a full Lumos DB environment.

## Features

- Test PostgreSQL plugin's metadata
- Test extraction from PostgreSQL databases
- Test data transformation
- Test loading data into PostgreSQL tables
- Configurable via command-line arguments

## Building

To build the test program:

```bash
# Make the build script executable
chmod +x build.sh

# Run the build script
./build.sh
```

## Usage

```bash
# Run with default settings
RUST_LOG=info cargo run -- -p /path/to/postgresql.wasm

# Show all available options
RUST_LOG=info cargo run -- --help

# Test with a specific PostgreSQL connection
RUST_LOG=info cargo run -- -p /path/to/postgresql.wasm -c "postgres://user:password@host:port/database"

# Skip certain operations
RUST_LOG=info cargo run -- -p /path/to/postgresql.wasm --skip-extract --skip-load
```

### Command-line Options

- `-p, --plugin-path`: Path to the PostgreSQL WASM plugin (default: `../plugins/postgresql.wasm`)
- `-c, --connection`: PostgreSQL connection string (default: `postgres://postgres:postgres@localhost:5432/postgres`)
- `-d, --database`: PostgreSQL database name (default: `postgres`)
- `-s, --source-table`: PostgreSQL table for extraction (default: `users`)
- `--target-table`: PostgreSQL table for loading (default: `output_users`)
- `-q, --query`: SQL query for extraction (default: `SELECT * FROM users LIMIT 10`)
- `--skip-extract`: Skip (don't run) extraction operation
- `--skip-transform`: Skip (don't run) transformation operation
- `--skip-load`: Skip (don't run) loading operation

## Example

```bash
# Test with a specific query and connection
RUST_LOG=info cargo run -- \
  -p /Users/louloulin/Documents/linchong/crop/lumos-db/plugins/postgresql.wasm \
  -c "postgres://postgres:postgres@localhost:5432/mydb" \
  -q "SELECT id, name, email FROM customers WHERE active=true LIMIT 20" \
  -s "customers" \
  --target-table "processed_customers"
``` 