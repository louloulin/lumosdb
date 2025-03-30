# PostgreSQL Plugin for Lumos DB

This is a WebAssembly plugin for Lumos DB that provides PostgreSQL database integration. The plugin implements the standard Lumos DataFlow plugin interface for extracting data from, transforming, and loading data into PostgreSQL databases.

## Features

- Extract data from PostgreSQL tables using SQL queries
- Transform data using simple transformations
- Load data into PostgreSQL tables

## Configuration Options

### Extractor Options

- `connection_string`: PostgreSQL connection string (e.g., `postgres://user:password@localhost:5432/database`)
- `table`: The name of the table to extract data from
- `query`: SQL query to use for extraction (overrides table if specified)

### Loader Options

- `connection_string`: PostgreSQL connection string
- `table`: The name of the table to load data into
- `batch_size`: Number of records to insert per batch (default: 100)
- `insert_mode`: How to handle duplicates (`insert`, `update`, `upsert`)

## Building

To build the plugin for WebAssembly:

```bash
# Add the WebAssembly target
rustup target add wasm32-unknown-unknown

# Build the plugin
cargo build --target wasm32-unknown-unknown --release
```

The compiled WebAssembly module will be located at `target/wasm32-unknown-unknown/release/postgresql_plugin.wasm`.

## Testing

You can test this plugin with the Lumos DB WASM test tool by running:

```bash
cd /path/to/lumos-db/dataflow/wasm-test
cargo run -- -p /path/to/postgresql_plugin.wasm
```

## Implementation Notes

This plugin is a reference implementation for PostgreSQL integration with Lumos DB. In a production environment, you would need to:

1. Add proper error handling and logging
2. Implement transaction support
3. Add more sophisticated connection pooling
4. Handle complex data types and schema mapping

## License

MIT 