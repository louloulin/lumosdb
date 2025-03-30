# PostgreSQL WASM Plugin Tester

This is a test program for the PostgreSQL WebAssembly plugin in Lumos DB. It allows you to test the extract, transform, and load functions of the plugin without needing to set up a full Lumos DB environment.

## Features

- Test PostgreSQL plugin's metadata
- Test extraction from PostgreSQL databases
- Test data transformation
- Test loading data into PostgreSQL tables
- Benchmark plugin performance with multiple iterations
- Save test results to JSON files for further analysis
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
cargo run -- --help

# Test with a specific PostgreSQL connection
RUST_LOG=info cargo run -- -p /path/to/postgresql.wasm -c "postgres://user:password@host:port/database"

# Skip certain operations
RUST_LOG=info cargo run -- -p /path/to/postgresql.wasm --skip-extract --skip-load

# Run in benchmark mode with multiple iterations
RUST_LOG=info cargo run -- -p /path/to/postgresql.wasm --benchmark --iterations 100

# Save test results to file
RUST_LOG=info cargo run -- -p /path/to/postgresql.wasm --save-results --output-path ./results
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
- `--save-results`: Save test results to JSON file
- `--output-path`: Output directory for test results (default: `./test_results`)
- `--iterations`: Number of iterations for benchmarking (default: `1`)
- `--benchmark`: Run in benchmark mode (focus on performance)

## Benchmark Mode

When running in benchmark mode (`--benchmark`), the test program will:

1. Run the specified number of iterations (`--iterations`)
2. Measure the time taken for each phase (extract, transform, load)
3. Display average times when complete
4. Optionally save detailed timing information to a JSON file if `--save-results` is used

Benchmark results include:
- Average time for extraction
- Average time for transformation
- Average time for loading
- Total execution time
- Record count

## Saving Test Results

When the `--save-results` flag is used, the test program will save detailed results to a JSON file in the specified output directory (`--output-path`). Each test run gets a unique ID and timestamp.

The saved JSON file includes:
- Plugin metadata
- Sample records
- Transformed records
- Performance metrics
- Any error messages
- Success/failure status

This is useful for:
- Comparing performance between different plugin versions
- Analyzing transformation results
- Debugging issues
- Generating reports

## Example

```bash
# Test with a specific query and connection, save results, and benchmark
RUST_LOG=info cargo run -- \
  -p /Users/louloulin/Documents/linchong/crop/lumos-db/plugins/postgresql.wasm \
  -c "postgres://postgres:postgres@localhost:5432/mydb" \
  -q "SELECT id, name, email FROM customers WHERE active=true LIMIT 20" \
  -s "customers" \
  --target-table "processed_customers" \
  --benchmark \
  --iterations 50 \
  --save-results \
  --output-path "./benchmark_results"
``` 