use actix_web::dev::{ServiceRequest, ServiceResponse, Service, Transform};
use actix_web::http::header::{HeaderName, HeaderValue};
use actix_web::{Error, HttpMessage};
use futures::future::{ok, Ready};
use futures::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::env;

pub struct Auth;

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
        // 从环境变量获取API密钥
        let api_key = env::var("LUMOS_API_KEY").unwrap_or_default();
        ok(AuthMiddleware { service, api_key })
    }
}

pub struct AuthMiddleware<S> {
    service: S,
    api_key: String,
}

impl<S, B> Service<ServiceRequest> for AuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // 如果未设置API密钥，则跳过验证
        if self.api_key.is_empty() {
            return Box::pin(self.service.call(req));
        }

        // 检查是否包含API密钥
        let api_key_header = HeaderName::from_static("x-api-key");
        let is_authorized = req
            .headers()
            .get(api_key_header)
            .map(|value| value == HeaderValue::from_str(&self.api_key).unwrap_or_default())
            .unwrap_or(false);

        // 添加到请求扩展中，用于后续处理
        req.extensions_mut().insert(AuthStatus {
            authorized: is_authorized,
        });

        Box::pin(self.service.call(req))
    }
}

#[derive(Debug, Clone)]
pub struct AuthStatus {
    pub authorized: bool,
}

// 用于检查请求是否已授权的辅助函数
pub fn is_authorized(req: &ServiceRequest) -> bool {
    req.extensions()
        .get::<AuthStatus>()
        .map(|status| status.authorized)
        .unwrap_or(false)
} 