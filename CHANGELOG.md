# CHANGELOG

## [Unreleased]

### Added
- Multi-level caching strategy implementation
  - Memory caching for frequently accessed data
  - Disk-based caching for larger datasets
  - Distributed caching support through the cache module
  - Cache invalidation mechanisms
  - Cache warming capabilities

### Fixed
- Fixed QueryType implementation with Hash trait
- Fixed DuckDB error handling issues
- Fixed vector module distance calculation references
- Improved vector storage implementation
- Added proper reference for DuckDB errors
- Fixed NULL parameter handling in query executor

### Changed
- Updated build script for better dependency management
- Improved error handling in vector operations
- Made QueryParser and QueryExecutor methods require mutable references when needed 