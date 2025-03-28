# Changelog

## [Unreleased]

### Fixed

- Fixed build issues in core crate:
  - Added missing `duckdb::Error` to `LumosError` enum for proper error handling
  - Fixed thread safety issues in sync mechanisms by disabling background thread and making it manual
  - Added custom `OwnedRow` type for handling SQLite rows with correct ownership
  - Updated sync strategy to handle Value references correctly
  - Fixed `row.get()` invocations to use string column names instead of numeric indices
  - Addressed parameter typing issues for DuckDB queries
  - Added helper function to convert between SQLite and DuckDB value types
  - Fixed column access in sync module to properly reference column names

### Added

- Added a build.rs script for the core crate to handle dependencies
- Created a utils.rs module with helper functions for file and directory operations
- Introduced DuckDBRowData struct in schema.rs for better DuckDB row handling
- Added multi-level caching strategy implementation:
  - Memory caching layer for frequent queries
  - Disk-based caching for persistence
  - Distributed caching support
  - Cache invalidation mechanisms
  - Cache warming capabilities

### Changed

- Updated sync mechanism to use manual synchronization instead of background threads
- Improved error handling throughout the codebase
- Enhanced type conversion between SQLite and DuckDB
- Modified sync strategy to use owned data structures
- Updated row data handling to use hashmaps for column access 