# LumosDB Rust SDK

[LumosDB](https://github.com/linchonglin/lumos-db) 的Rust客户端库，用于向量搜索和向量数据管理。

## 功能特点

- 简单的API设计
- 异步支持 (使用 Tokio)
- 完整类型支持
- 向量搜索、插入、更新和删除
- 集合管理
- 健康检查
- 错误处理

## 安装

将以下内容添加到您的 `Cargo.toml` 文件中:

```toml
[dependencies]
lumos-db = "0.1.0"
```

## 使用示例

```rust
use lumos_db::LumosDbClient;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // 创建客户端
    let client = LumosDbClient::new("http://localhost:8000");
    
    // 可选：设置API密钥
    // let client = client.with_api_key("your-api-key");
    
    // 健康检查
    let health = client.health().check().await?;
    println!("服务状态: {}, 版本: {}", health.status, health.version);
    
    // 列出集合
    let collections = client.db().list_collections().await?;
    println!("集合列表: {:?}", collections);
    
    // 创建一个集合
    client.db().create_collection("test_collection", 4).await?;
    
    // 获取向量客户端
    let vector_client = client.vector("test_collection");
    
    // 插入向量
    vector_client.insert(
        "doc1".to_string(),
        vec![0.1, 0.2, 0.3, 0.4],
        None,
        None,
    ).await?;
    
    // 搜索向量
    let results = vector_client.search(
        vec![0.1, 0.2, 0.3, 0.4],
        None,
    ).await?;
    
    println!("搜索结果: {:?}", results.matches);
    
    Ok(())
}
```

更详细的示例请参考 [examples](./examples) 目录。

## API概览

### 主客户端

```rust
// 创建客户端
let client = LumosDbClient::new("http://localhost:8000");

// 设置API密钥
let client = client.with_api_key("your-api-key");

// 获取不同的客户端
let db_client = client.db();
let vector_client = client.vector("collection_name");
let health_client = client.health();
```

### 数据库客户端

```rust
// 列出所有集合
let collections = client.db().list_collections().await?;

// 创建集合
client.db().create_collection("collection_name", 4).await?;

// 删除集合
client.db().delete_collection("collection_name").await?;

// 获取集合信息
let collection_info = client.db().get_collection::<CollectionInfo>("collection_name").await?;
```

### 向量客户端

```rust
// 获取向量客户端
let vector_client = client.vector("collection_name");

// 插入向量
vector_client.insert(
    "doc1".to_string(),
    vec![0.1, 0.2, 0.3, 0.4],
    Some(metadata),
    Some("default".to_string()),
).await?;

// 更新向量
vector_client.update(
    "doc1".to_string(),
    Some(vec![0.5, 0.6, 0.7, 0.8]),
    Some(metadata),
    None,
).await?;

// 删除向量
vector_client.delete("doc1".to_string(), None).await?;

// 搜索向量
let options = VectorSearchOptions {
    top_k: Some(10),
    score_threshold: Some(0.7),
    filter: Some(filter),
    namespace: None,
};

let results = vector_client.search(
    vec![0.1, 0.2, 0.3, 0.4],
    Some(options),
).await?;
```

### 健康检查客户端

```rust
// 检查健康状态
let health = client.health().check().await?;
println!("状态: {}, 版本: {}", health.status, health.version);
```

## 错误处理

所有API方法均返回 `Result<T, Error>` 类型，其中 `Error` 是SDK的错误类型。

```rust
match client.db().list_collections().await {
    Ok(collections) => {
        println!("集合列表: {:?}", collections);
    },
    Err(e) => {
        eprintln!("错误: {}", e);
        // 处理不同类型的错误
        match e {
            Error::ApiError(code, msg) => {
                eprintln!("API错误 {}: {}", code, msg);
            },
            Error::RequestError(e) => {
                eprintln!("网络请求错误: {}", e);
            },
            // 其他错误类型...
            _ => {
                eprintln!("其他错误: {}", e);
            }
        }
    }
}
```

## 许可证

MIT

## 贡献

欢迎提交问题和Pull Request! 