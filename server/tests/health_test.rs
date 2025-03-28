use actix_web::{test, App};
use actix_web::http::StatusCode;
use lumos_server::api::health;
use serde_json::Value;

#[actix_web::test]
async fn test_health_endpoint() {
    // 设置测试服务
    let app = test::init_service(
        App::new().service(actix_web::web::scope("/health").configure(health::configure))
    ).await;
    
    // 创建请求
    let req = test::TestRequest::get()
        .uri("/health")
        .to_request();
    
    // 发送请求并验证响应
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    
    // 解析响应体
    let body = test::read_body(resp).await;
    let json: Value = serde_json::from_slice(&body).unwrap();
    
    // 验证响应结构
    assert_eq!(json["success"], true);
    assert!(json["data"]["status"].as_str().unwrap() == "ok");
    assert!(json["data"]["version"].as_str().is_some());
    assert!(json["data"]["timestamp"].as_i64().is_some());
} 