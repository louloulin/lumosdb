use actix_web::{test, web, App};
use actix_web::http::StatusCode;
use std::sync::Arc;
use std::fs;

// 使用extern crate并重命名包名
extern crate lumos_server as lumos_server_crate;
use lumos_server_crate::api;
use lumos_server_crate::db::executor::DbExecutor;
use lumos_server_crate::models::db::QueryRequest;

#[actix_web::test]
async fn test_health_endpoint() {
    // 创建测试数据库
    let db_path = "test_db.lumos";
    if let Ok(_) = fs::metadata(db_path) {
        let _ = fs::remove_file(db_path);
    }
    
    let db_executor = Arc::new(DbExecutor::new(db_path).unwrap());
    
    // 设置测试应用
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(db_executor.clone()))
            .service(
                web::scope("/api")
                    .configure(api::configure_routes)
            )
    ).await;
    
    // 发送请求
    let req = test::TestRequest::get()
        .uri("/api/health")
        .to_request();
    
    // 获取响应
    let resp = test::call_service(&app, req).await;
    
    // 检查响应状态码
    assert_eq!(resp.status(), StatusCode::OK);
    
    // 检查响应体
    let body = test::read_body(resp).await;
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(json["success"], true);
    assert_eq!(json["data"]["status"], "ok");
    
    // 清理
    let _ = fs::remove_file(db_path);
}

#[actix_web::test]
async fn test_db_query_endpoint() {
    // 创建测试数据库
    let db_path = "test_query_db.lumos";
    if let Ok(_) = fs::metadata(db_path) {
        let _ = fs::remove_file(db_path);
    }
    
    let db_executor = Arc::new(DbExecutor::new(db_path).unwrap());
    
    // 创建测试表
    let create_table_sql = "CREATE TABLE test_users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)";
    let _ = db_executor.execute(create_table_sql, &[]).unwrap();
    
    // 插入测试数据
    let insert_sql = "INSERT INTO test_users (name, age) VALUES ('Alice', 30), ('Bob', 25), ('Charlie', 35)";
    let _ = db_executor.execute(insert_sql, &[]).unwrap();
    
    // 设置测试应用
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(db_executor.clone()))
            .service(
                web::scope("/api")
                    .configure(api::configure_routes)
            )
    ).await;
    
    // 准备查询请求
    let query = QueryRequest {
        sql: "SELECT * FROM test_users WHERE age > 25 ORDER BY age DESC".to_string(),
        params: vec![],
    };
    
    // 发送请求
    let req = test::TestRequest::post()
        .uri("/api/rest/db/query")
        .set_json(&query)
        .to_request();
    
    // 获取响应
    let resp = test::call_service(&app, req).await;
    
    // 检查响应状态码
    assert_eq!(resp.status(), StatusCode::OK);
    
    // 检查响应体
    let body = test::read_body(resp).await;
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(json["success"], true);
    
    // 验证结果包含两条记录（age > 25）
    let rows = &json["data"]["rows"];
    assert_eq!(rows.as_array().unwrap().len(), 2);
    
    // 验证第一条是Charlie (35岁)
    let first_row = &rows[0];
    assert_eq!(first_row["name"], "Charlie");
    assert_eq!(first_row["age"], "35");
    
    // 验证第二条是Alice (30岁)
    let second_row = &rows[1];
    assert_eq!(second_row["name"], "Alice");
    assert_eq!(second_row["age"], "30");
    
    // 清理
    let _ = fs::remove_file(db_path);
} 