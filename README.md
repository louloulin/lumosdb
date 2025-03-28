# Lumos-DB: 轻量级数据平台与AI Agent结合

Lumos-DB is a lightweight data platform designed to work with AI Agents, providing efficient storage, retrieval, and processing of data with both OLTP and OLAP capabilities.

## Features

- Hybrid storage model (SQLite + DuckDB)
- Vector embeddings for AI applications
- Real-time stream processing
- Query optimization for complex analytics
- Multi-level caching system

## Documentation

- [Project Plan](./plan2.md)
- [Development Guide](./docs/packaging.md)
- [Dependency Management](./docs/dependencies.md) - Resolving common dependency issues

## Getting Started

To build and run Lumos-DB:

```bash
# Install just command runner
# Mac: brew install just
# Linux: curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Build the project
just build

# Run tests
just test

# Package the project
just package
```

See [packaging documentation](./docs/packaging.md) for more details.

## Known Issues

If you encounter dependency conflicts between arrow-arith and chrono, please refer to the [dependency management guide](./docs/dependencies.md) for solutions.

## License

MIT 