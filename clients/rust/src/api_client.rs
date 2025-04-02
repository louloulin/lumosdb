use reqwest::{Client, StatusCode};
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;
use url::Url;

use crate::error::{Error, Result};

/// API客户端
pub struct ApiClient {
    /// 基础URL
    base_url: String,
    /// HTTP客户端
    http_client: Client,
    /// API密钥
    api_key: Option<String>,
}

impl ApiClient {
    /// 创建新的API客户端
    pub fn new(base_url: &str) -> Self {
        let http_client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            base_url: base_url.to_string(),
            http_client,
            api_key: None,
        }
    }

    /// 设置API密钥
    pub fn with_api_key(&self, api_key: &str) -> Self {
        Self {
            base_url: self.base_url.clone(),
            http_client: self.http_client.clone(),
            api_key: Some(api_key.to_string()),
        }
    }
    
    /// 获取基础URL（用于测试）
    #[cfg(test)]
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// 构建完整的URL
    fn build_url(&self, path: &str) -> Result<Url> {
        let url_str = if path.starts_with('/') {
            format!("{}{}", self.base_url, path)
        } else {
            format!("{}/{}", self.base_url, path)
        };

        Url::parse(&url_str).map_err(Error::from)
    }

    /// 添加请求头
    fn add_headers(&self, builder: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        let mut builder = builder.header("Content-Type", "application/json");
        
        if let Some(api_key) = &self.api_key {
            builder = builder.header("X-API-Key", api_key);
        }
        
        builder
    }

    /// 处理HTTP响应
    async fn handle_response<T>(&self, response: reqwest::Response) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let status = response.status();
        let body = response.text().await.map_err(Error::from)?;

        if status.is_success() || status == StatusCode::BAD_REQUEST {
            serde_json::from_str(&body).map_err(Error::from)
        } else {
            Err(Error::UnexpectedResponse(format!(
                "Status: {}, Body: {}",
                status, body
            )))
        }
    }

    /// 发送GET请求
    pub async fn get<T>(&self, path: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let url = self.build_url(path)?;
        let builder = self.http_client.get(url);
        let builder = self.add_headers(builder);
        
        let response = builder.send().await.map_err(Error::from)?;
        self.handle_response(response).await
    }

    /// 发送POST请求
    pub async fn post<T, B>(&self, path: &str, body: &B) -> Result<T>
    where
        T: DeserializeOwned,
        B: Serialize,
    {
        let url = self.build_url(path)?;
        let builder = self.http_client.post(url);
        let builder = self.add_headers(builder);
        
        let response = builder
            .json(body)
            .send()
            .await
            .map_err(Error::from)?;
            
        self.handle_response(response).await
    }

    /// 发送PUT请求
    pub async fn put<T, B>(&self, path: &str, body: &B) -> Result<T>
    where
        T: DeserializeOwned,
        B: Serialize,
    {
        let url = self.build_url(path)?;
        let builder = self.http_client.put(url);
        let builder = self.add_headers(builder);
        
        let response = builder
            .json(body)
            .send()
            .await
            .map_err(Error::from)?;
            
        self.handle_response(response).await
    }

    /// 发送DELETE请求
    pub async fn delete<T>(&self, path: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let url = self.build_url(path)?;
        let builder = self.http_client.delete(url);
        let builder = self.add_headers(builder);
        
        let response = builder.send().await.map_err(Error::from)?;
        self.handle_response(response).await
    }
} 