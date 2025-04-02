# LumosDB 客户端验证工具

这个目录包含用于验证各个语言的LumosDB客户端实现是否正常工作的脚本。这些验证脚本执行一系列基本操作来测试客户端与LumosDB服务器的交互。

## 验证内容

每个脚本都执行以下操作：

1. 创建客户端并连接到服务器
2. 执行健康检查
3. 列出现有集合
4. 创建测试集合
5. 添加向量
6. 搜索向量
7. 更新向量
8. 删除向量
9. 删除测试集合

## 支持的语言

目前支持以下客户端的验证：

- Go (`validate_go.go`)
- Rust (`validate_rust.rs`)
- Kotlin (`validate_kotlin.kt`)

## 运行验证

### 前提条件

- LumosDB服务器必须在本地运行，默认端口为8000
- 根据需要验证的客户端，您需要安装相应的语言环境：
  - Go (1.18+)
  - Rust (1.60+)
  - Kotlin (需要JDK 8+和Gradle)

### 运行所有验证

使用提供的Shell脚本运行所有验证：

```bash
./run_validations.sh
```

### 单独运行验证

#### Go

```bash
go run validate_go.go
```

#### Rust

```bash
# 在validation目录中
cargo run
```

#### Kotlin

在项目根目录中：

```bash
./gradlew :clients:validation:run
```

## 排查问题

如果验证失败，请检查：

1. LumosDB服务器是否正在运行（`http://localhost:8000/health`）
2. 网络连接是否正常
3. 客户端实现是否与服务器API兼容
4. 查看日志了解详细错误信息

## 添加新的验证

要为新的客户端语言添加验证：

1. 创建一个新的验证脚本，参考现有脚本的结构
2. 更新`run_validations.sh`以包含新的验证步骤
3. 添加必要的构建文件（如果需要） 