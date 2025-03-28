use criterion::{black_box, criterion_group, criterion_main, Criterion};
use lumos_core::{
    sqlite::SqliteEngine,
    duckdb::DuckDbEngine,
    query::parser::QueryParser,
};
use tempfile::tempdir;

/// Benchmark query parsing
fn bench_query_parsing(c: &mut Criterion) {
    let mut group = c.benchmark_group("query_parsing");
    let parser = QueryParser::new();
    
    group.bench_function("parse_select", |b| {
        b.iter(|| {
            let sql = "SELECT * FROM users WHERE id = 1";
            black_box(parser.parse_query_type(sql))
        })
    });
    
    group.bench_function("parse_insert", |b| {
        b.iter(|| {
            let sql = "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')";
            black_box(parser.parse_query_type(sql))
        })
    });
    
    group.bench_function("parse_analytical", |b| {
        b.iter(|| {
            let sql = "SELECT date, COUNT(*), SUM(amount) FROM sales GROUP BY date";
            black_box(parser.is_analytical_query(sql))
        })
    });
    
    group.finish();
}

/// Benchmark SQLite operations
fn bench_sqlite_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("sqlite_operations");
    
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.db");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = SqliteEngine::new(db_path_str);
    engine.init().expect("Failed to initialize SQLite");
    
    // Create a test table
    engine.execute(
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value REAL)",
        &[],
    ).expect("Failed to create table");
    
    // Insert some test data
    for i in 0..100 {
        engine.execute(
            "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
            &[&i, &format!("name_{}", i), &(i as f64 * 1.5)],
        ).expect("Failed to insert data");
    }
    
    group.bench_function("simple_select", |b| {
        b.iter(|| {
            black_box(engine.query_all(
                "SELECT * FROM test_table WHERE id < 10",
                &[],
            ))
        })
    });
    
    group.bench_function("insert_row", |b| {
        let mut id = 1000;
        b.iter(|| {
            id += 1;
            black_box(engine.execute(
                "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
                &[&id, &format!("name_{}", id), &(id as f64 * 1.5)],
            ))
        })
    });
    
    group.finish();
}

criterion_group!(benches, bench_query_parsing, bench_sqlite_operations);
criterion_main!(benches);
