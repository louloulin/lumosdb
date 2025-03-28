use actix_web::{test, web, App, HttpResponse, Responder};
use actix_web::http::StatusCode;
use actix_web::dev::Service;
use lumos_server::middleware::auth::Auth;
use jsonwebtoken::{encode, Header, EncodingKey};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
    iat: usize,
}

async fn test_handler() -> impl Responder {
    HttpResponse::Ok().body("authorized")
}

#[actix_web::test]
async fn test_auth_middleware_with_jwt() {
    // 设置测试服务
    let app = test::init_service(
        App::new()
            .wrap(Auth::default())
            .route("/test", web::get().to(test_handler))
    ).await;
    
    // 创建JWT令牌
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as usize;
    let claims = Claims {
        sub: "test_user".to_string(),
        exp: now + 3600, // 1小时后过期
        iat: now,
    };
    
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("lumos_dev_secret".as_bytes())
    ).unwrap();
    
    // 创建带有JWT的请求
    let req = test::TestRequest::get()
        .uri("/test")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    
    // 发送请求并验证响应
    let resp = app.call(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    
    let body = test::read_body(resp).await;
    assert_eq!(body, "authorized");
}

#[actix_web::test]
async fn test_auth_middleware_with_api_key() {
    // 设置测试服务
    let app = test::init_service(
        App::new()
            .wrap(Auth::default())
            .route("/test", web::get().to(test_handler))
    ).await;
    
    // 创建带有API密钥的请求
    let req = test::TestRequest::get()
        .uri("/test")
        .insert_header(("X-API-Key", "lumos_dev_key"))
        .to_request();
    
    // 发送请求并验证响应
    let resp = app.call(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    
    let body = test::read_body(resp).await;
    assert_eq!(body, "authorized");
}

#[actix_web::test]
async fn test_auth_middleware_unauthorized() {
    // 设置测试服务
    let app = test::init_service(
        App::new()
            .wrap(Auth::default())
            .route("/test", web::get().to(test_handler))
    ).await;
    
    // 创建没有认证的请求
    let req = test::TestRequest::get()
        .uri("/test")
        .to_request();
    
    // 发送请求并验证响应
    let resp = app.call(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
} 