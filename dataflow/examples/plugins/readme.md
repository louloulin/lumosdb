# Lumos DataFlow 插件开发指南

本指南介绍如何开发 Lumos DataFlow 的插件，扩展其 ETL 功能。

## 开发环境设置

插件开发需要以下环境：

1. Rust 工具链（推荐 1.56.0 或更高版本）
2. Cargo 构建工具
3. Lumos DataFlow 框架源码或依赖

## 插件类型

Lumos DataFlow 支持三种类型的插件：

1. **提取器插件**：从各种数据源提取数据
2. **转换器插件**：处理和转换数据
3. **加载器插件**：将数据加载到目标位置

## 插件结构

一个典型的插件项目结构如下：

```
my-plugin/
├── Cargo.toml
├── src/
│   ├── lib.rs       # 主要插件代码
│   ├── extractor.rs # 如果实现提取器
│   ├── transformer.rs # 如果实现转换器
│   └── loader.rs    # 如果实现加载器
└── examples/
    └── demo.rs      # 插件使用示例
```

## Cargo.toml 配置

```toml
[package]
name = "lumos-dataflow-plugin-myplugin"
version = "0.1.0"
authors = ["Your Name <your.email@example.com>"]
edition = "2021"
description = "A description of your plugin"

[lib]
crate-type = ["cdylib"]  # 重要：必须是动态库

[dependencies]
lumos-dataflow = { version = "0.1", optional = true }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
log = "0.4"
thiserror = "1.0"
# 其他依赖...

[dev-dependencies]
lumos-dataflow = "0.1"
```

## 基本插件实现

以下是一个简单的提取器插件实现示例：

```rust
use std::collections::HashMap;
use lumos_dataflow::plugin::{Plugin, PluginMetadata, PluginType};
use lumos_dataflow::types::{DataRecord, ETLError};
use serde_json::Value;

#[derive(Default)]
pub struct MyPlugin {
    // 插件状态
}

impl Plugin for MyPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata::new(
            "my-plugin",
            "0.1.0",
            "My awesome plugin description",
            "Your Name",
            "0.1.0",
        )
        .with_feature("custom-extraction")
        .with_license("MIT")
    }
    
    fn init(&mut self) -> Result<(), String> {
        // 初始化插件
        Ok(())
    }
    
    fn shutdown(&mut self) -> Result<(), String> {
        // 清理资源
        Ok(())
    }
    
    fn get_type(&self) -> PluginType {
        PluginType::Extractor // 或 Transformer 或 Loader
    }
    
    fn process_config(&self, config: HashMap<String, Value>) -> Result<HashMap<String, Value>, String> {
        // 处理和验证配置
        Ok(config)
    }
}

// 提供创建插件的导出函数
#[no_mangle]
pub extern "C" fn create_plugin() -> *mut dyn Plugin {
    let plugin = MyPlugin::default();
    Box::into_raw(Box::new(plugin))
}
```

## 实现提取器

如果你的插件是提取器，需要实现相应的提取功能：

```rust
use actix::prelude::*;
use lumos_dataflow::actors::messages::ExtractData;

impl Actor for MyPlugin {
    type Context = Context<Self>;
}

impl Handler<ExtractData> for MyPlugin {
    type Result = ResponseFuture<Result<Vec<DataRecord>, ETLError>>;
    
    fn handle(&mut self, msg: ExtractData, _: &mut Context<Self>) -> Self::Result {
        // 实现提取逻辑
        Box::pin(async {
            // 提取数据...
            Ok(vec![])
        })
    }
}
```

## 插件测试

可以创建一个简单的测试程序来测试你的插件：

```rust
use lumos_dataflow::plugin::{Plugin, PluginType};

fn main() {
    // 加载插件
    let lib = unsafe { libloading::Library::new("path/to/your/plugin.so").unwrap() };
    let create_fn: libloading::Symbol<unsafe fn() -> *mut dyn Plugin> = 
        unsafe { lib.get(b"create_plugin").unwrap() };
    let plugin = unsafe { Box::from_raw(create_fn()) };
    
    // 输出插件信息
    let metadata = plugin.metadata();
    println!("插件: {} v{}", metadata.name, metadata.version);
    println!("类型: {:?}", plugin.get_type());
    println!("描述: {}", metadata.description);
}
```

## 构建和安装

构建插件：

```bash
cargo build --release
```

这将在 `target/release/` 目录下生成 `.so`（Linux）、`.dll`（Windows）或 `.dylib`（macOS）文件。

安装插件：

```bash
cp target/release/libmy_plugin.* /path/to/lumos-dataflow/plugins/
```

## 使用插件

在 ETL 配置中，可以使用自定义插件：

```yaml
jobs:
  extract_custom:
    type: "extractor"
    extractor_type: "my-plugin"  # 或 "plugin:my-plugin"
    options:
      # 插件特定的选项
      custom_option: "value"
```

## 调试插件

1. 使用 `RUST_LOG=debug` 环境变量启用详细日志
2. 添加日志输出到文件，以检查插件加载和执行问题
3. 使用 `cargo test` 运行插件的单元测试

## 最佳实践

1. 提供详细的文档，说明插件的功能和配置选项
2. 使用语义化版本管理插件版本
3. 谨慎处理错误，避免崩溃影响主程序
4. 遵循 Rust 的内存安全原则，尤其是在FFI边界
5. 考虑插件的依赖项大小，避免不必要的依赖 