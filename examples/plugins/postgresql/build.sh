#!/bin/bash
set -e

echo "Building PostgreSQL plugin for WebAssembly..."

# Ensure we have the WebAssembly target
rustup target add wasm32-unknown-unknown

# Build the plugin for release
cargo build --target wasm32-unknown-unknown --release

# Create plugins directory if it doesn't exist
mkdir -p ../../../plugins

# Copy the compiled WASM file to the plugins directory
cp ./target/wasm32-unknown-unknown/release/postgresql_plugin.wasm ../../../plugins/postgresql.wasm

echo "PostgreSQL plugin built successfully and copied to plugins directory."
echo "You can test it with: cd ../../../dataflow/wasm-test && cargo run -- -p ../plugins/postgresql.wasm" 