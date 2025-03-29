use std::future::{ready, Ready};
use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse, http,
};
use futures_util::future::LocalBoxFuture;
use log::debug;
use actix_web::body::BoxBody;

use crate::models::response::{ApiResponse, ApiError};

/// API认证中间件
pub struct AuthMiddleware {
    api_key: Option<String>,
}

impl AuthMiddleware {
    /// 创建新的认证中间件
    pub fn new(api_key: Option<String>) -> Self {
        Self { api_key }
    }
}

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = AuthMiddlewareService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService {
            service,
            api_key: self.api_key.clone(),
        }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: S,
    api_key: Option<String>,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Check if API key is required
        if self.api_key.is_none() {
            let fut = self.service.call(req);
            return Box::pin(async move {
                let res = fut.await?;
                Ok(res)
            });
        }

        // Check if the request has valid API key
        let api_key = self.api_key.as_ref().unwrap();
        let mut is_authenticated = false;
        
        // Check Authorization header
        if let Some(auth_header) = req.headers().get("Authorization") {
            if let Ok(auth_str) = auth_header.to_str() {
                if auth_str.starts_with("Bearer ") {
                    let token = &auth_str[7..];
                    if token == api_key {
                        is_authenticated = true;
                    }
                }
            }
        }
        
        // Check X-API-Key header
        if !is_authenticated {
            if let Some(key_header) = req.headers().get("X-API-Key") {
                if let Ok(key) = key_header.to_str() {
                    if key == api_key {
                        is_authenticated = true;
                    }
                }
            }
        }
        
        // Check query parameters
        if !is_authenticated {
            let query_string = req.query_string();
            if query_string.contains(&format!("api_key={}", api_key)) {
                is_authenticated = true;
            }
        }
        
        // Proceed with request if authenticated
        if is_authenticated {
            debug!("API key authentication successful");
            let fut = self.service.call(req);
            Box::pin(async move {
                let res = fut.await?;
                Ok(res)
            })
        } else {
            // Return unauthorized error
            debug!("API key authentication failed");
            Box::pin(async move {
                Err(actix_web::error::ErrorUnauthorized("Invalid or missing API key"))
            })
        }
    }
} 