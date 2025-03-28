use std::future::{ready, Ready};
use std::rc::Rc;
use std::task::{Context, Poll};
use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    error::ErrorUnauthorized,
    http::header,
    Error,
};
use futures_util::future::LocalBoxFuture;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use log::debug;

// 定义JWT声明结构
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
    iat: usize,
}

// 认证中间件结构
pub struct Auth {
    jwt_secret: String,
}

impl Auth {
    // 创建新的认证中间件
    pub fn new(jwt_secret: String) -> Self {
        Self { jwt_secret }
    }
}

// 默认无需密钥的认证中间件，用于开发环境
impl Default for Auth {
    fn default() -> Self {
        Self {
            jwt_secret: "lumos_dev_secret".to_string(),
        }
    }
}

// 实现中间件转换特性
impl<S, B> Transform<S, ServiceRequest> for Auth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddleware {
            service,
            jwt_secret: self.jwt_secret.clone(),
        }))
    }
}

// 认证中间件服务
pub struct AuthMiddleware<S> {
    service: S,
    jwt_secret: String,
}

impl<S, B> Service<ServiceRequest> for AuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let jwt_secret = self.jwt_secret.clone();
        
        // 检查是否为不需要认证的路径（例如健康检查和登录/注册）
        let path = req.path();
        if path.starts_with("/api/health") || 
           path == "/api/auth/login" || 
           path == "/api/auth/register" {
            // 不需要认证的路径
            let fut = self.service.call(req);
            return Box::pin(async move {
                fut.await
            });
        }
        
        // 获取Authorization头
        let auth_header = req.headers().get(header::AUTHORIZATION);
        
        // 检查API密钥
        if let Some(api_key) = req.headers().get("X-API-Key") {
            if api_key == "lumos_dev_key" { // 在生产环境中应该使用环境变量或配置
                let fut = self.service.call(req);
                return Box::pin(async move {
                    fut.await
                });
            }
        }
        
        // 检查JWT令牌
        match auth_header {
            Some(auth_value) => {
                let auth_str = auth_value.to_str().unwrap_or("");
                if auth_str.starts_with("Bearer ") {
                    let token = &auth_str[7..]; // 去掉"Bearer "前缀
                    
                    // 验证JWT令牌
                    match decode::<Claims>(
                        token,
                        &DecodingKey::from_secret(jwt_secret.as_bytes()),
                        &Validation::new(Algorithm::HS256),
                    ) {
                        Ok(_) => {
                            // 令牌有效，继续处理
                            debug!("JWT验证成功");
                            let fut = self.service.call(req);
                            return Box::pin(async move {
                                fut.await
                            });
                        }
                        Err(e) => {
                            debug!("JWT验证失败: {}", e);
                            return Box::pin(async move {
                                Err(ErrorUnauthorized("无效的令牌"))
                            });
                        }
                    }
                }
            }
            None => {}
        }
        
        // 未提供有效的认证信息
        Box::pin(async move {
            Err(ErrorUnauthorized("需要认证"))
        })
    }
} 