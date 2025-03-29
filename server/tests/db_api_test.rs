use actix_web::{test, web, App};
use actix_web::http::StatusCode;
use std::sync::Arc;
use std::fs;
use serde_json::json;

// Import the server crate
extern crate lumos_server as lumos_server_crate;
use lumos_server_crate::api;
use lumos_server_crate::db::executor::DbExecutor;
use lumos_server_crate::models::db::{QueryRequest, TableInfo, ColumnInfo};

#[actix_web::test]
async fn test_query_endpoint() {
    // Create test database
    let db_path = "test_db_api.lumos";
    if fs::metadata(db_path).is_ok() {
        let _ = fs::remove_file(db_path);
    }
    
    let db_executor = Arc::new(DbExecutor::new(db_path).unwrap());
    
    // Create test table
    let create_table_sql = "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value REAL)";
    let _ = db_executor.execute(create_table_sql, &[]).unwrap();
    
    // Insert test data
    let insert_sql = "INSERT INTO test_table (name, value) VALUES ('item1', 10.5), ('item2', 20.5), ('item3', 30.5)";
    let _ = db_executor.execute(insert_sql, &[]).unwrap();
    
    // Set up test app
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(db_executor.clone()))
            .service(
                web::scope("/api")
                    .configure(api::configure_routes)
            )
    ).await;
    
    // Prepare query request
    let query = QueryRequest {
        sql: "SELECT * FROM test_table WHERE value > ?".to_string(),
        params: vec!["15.0".to_string()],
    };
    
    // Send request
    let req = test::TestRequest::post()
        .uri("/api/rest/db/query")
        .set_json(&query)
        .to_request();
    
    // Get response
    let resp = test::call_service(&app, req).await;
    
    // Check response status
    assert_eq!(resp.status(), StatusCode::OK);
    
    // Check response body
    let body = test::read_body(resp).await;
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(json["success"], true);
    
    // Verify results contain two records (value > 15.0)
    let rows = &json["data"]["rows"];
    assert_eq!(rows.as_array().unwrap().len(), 2);
    
    // Verify first row is item2
    let first_row = &rows[0];
    assert_eq!(first_row["name"], "item2");
    assert!(first_row["value"].as_str().unwrap().parse::<f64>().unwrap() > 15.0);
    
    // Verify second row is item3
    let second_row = &rows[1];
    assert_eq!(second_row["name"], "item3");
    assert!(second_row["value"].as_str().unwrap().parse::<f64>().unwrap() > 15.0);
    
    // Clean up
    let _ = fs::remove_file(db_path);
}

#[actix_web::test]
async fn test_list_tables_endpoint() {
    // Create test database
    let db_path = "test_list_tables.lumos";
    if fs::metadata(db_path).is_ok() {
        let _ = fs::remove_file(db_path);
    }
    
    let db_executor = Arc::new(DbExecutor::new(db_path).unwrap());
    
    // Create multiple test tables
    let create_table1 = "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
    let create_table2 = "CREATE TABLE products (id INTEGER PRIMARY KEY, title TEXT, price REAL)";
    
    let _ = db_executor.execute(create_table1, &[]).unwrap();
    let _ = db_executor.execute(create_table2, &[]).unwrap();
    
    // Set up test app
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(db_executor.clone()))
            .service(
                web::scope("/api")
                    .configure(api::configure_routes)
            )
    ).await;
    
    // Send request
    let req = test::TestRequest::get()
        .uri("/api/rest/db/tables")
        .to_request();
    
    // Get response
    let resp = test::call_service(&app, req).await;
    
    // Check response status
    assert_eq!(resp.status(), StatusCode::OK);
    
    // Check response body
    let body = test::read_body(resp).await;
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(json["success"], true);
    
    // Verify tables list contains our two tables
    let tables = &json["data"]["tables"];
    let tables_array = tables.as_array().unwrap();
    assert_eq!(tables_array.len(), 2);
    
    // Check that both our tables are in the response
    let table_names: Vec<&str> = tables_array
        .iter()
        .map(|t| t["name"].as_str().unwrap())
        .collect();
    
    assert!(table_names.contains(&"users"));
    assert!(table_names.contains(&"products"));
    
    // Clean up
    let _ = fs::remove_file(db_path);
}

#[actix_web::test]
async fn test_table_schema_endpoint() {
    // Create test database
    let db_path = "test_table_schema.lumos";
    if fs::metadata(db_path).is_ok() {
        let _ = fs::remove_file(db_path);
    }
    
    let db_executor = Arc::new(DbExecutor::new(db_path).unwrap());
    
    // Create test table with various column types
    let create_table = "CREATE TABLE complex_table (
        id INTEGER PRIMARY KEY, 
        name TEXT NOT NULL, 
        amount REAL DEFAULT 0.0,
        is_active BOOLEAN,
        created_at DATETIME
    )";
    
    let _ = db_executor.execute(create_table, &[]).unwrap();
    
    // Set up test app
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(db_executor.clone()))
            .service(
                web::scope("/api")
                    .configure(api::configure_routes)
            )
    ).await;
    
    // Send request
    let req = test::TestRequest::get()
        .uri("/api/rest/db/tables/complex_table/schema")
        .to_request();
    
    // Get response
    let resp = test::call_service(&app, req).await;
    
    // Check response status
    assert_eq!(resp.status(), StatusCode::OK);
    
    // Check response body
    let body = test::read_body(resp).await;
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(json["success"], true);
    
    // Verify schema contains all columns with correct types
    let columns = &json["data"]["columns"];
    let columns_array = columns.as_array().unwrap();
    assert_eq!(columns_array.len(), 5);
    
    // Check column properties
    let id_column = columns_array.iter().find(|c| c["name"] == "id").unwrap();
    assert_eq!(id_column["type"], "INTEGER");
    assert_eq!(id_column["primary_key"], true);
    
    let name_column = columns_array.iter().find(|c| c["name"] == "name").unwrap();
    assert_eq!(name_column["type"], "TEXT");
    assert_eq!(name_column["nullable"], false);
    
    let amount_column = columns_array.iter().find(|c| c["name"] == "amount").unwrap();
    assert_eq!(amount_column["type"], "REAL");
    assert!(amount_column["default_value"].is_string());
    
    // Clean up
    let _ = fs::remove_file(db_path);
} 