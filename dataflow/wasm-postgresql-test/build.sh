#!/bin/bash
set -e

echo "Building PostgreSQL WASM test program..."
cd "$(dirname "$0")"
cargo build

echo "PostgreSQL test program built successfully!"
echo
echo "Run examples:"
echo
echo "# Basic run with default options"
echo "RUST_LOG=info cargo run -- -p /Users/louloulin/Documents/linchong/crop/lumos-db/plugins/postgresql.wasm"
echo
echo "# Run with result saving"
echo "RUST_LOG=info cargo run -- -p /Users/louloulin/Documents/linchong/crop/lumos-db/plugins/postgresql.wasm --save-results"
echo
echo "# Run in benchmark mode with 10 iterations"
echo "RUST_LOG=info cargo run -- -p /Users/louloulin/Documents/linchong/crop/lumos-db/plugins/postgresql.wasm --benchmark --iterations 10"
echo
echo "# Run with specific database connection"
echo "RUST_LOG=info cargo run -- -p /Users/louloulin/Documents/linchong/crop/lumos-db/plugins/postgresql.wasm -c \"postgres://username:password@localhost:5432/mydb\""
echo
echo "# See all available options"
echo "cargo run -- --help" 