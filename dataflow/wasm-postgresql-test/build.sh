#!/bin/bash
set -e

echo "Building PostgreSQL WASM test program..."
cd "$(dirname "$0")"
cargo build

echo "PostgreSQL test program built successfully!"
echo "Run with one of the following commands:"
echo "RUST_LOG=info cargo run -- -p /Users/louloulin/Documents/linchong/crop/lumos-db/plugins/postgresql.wasm"
echo "RUST_LOG=info cargo run -- --help # To see all available options" 