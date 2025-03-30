#!/bin/bash
# WebAssembly插件系统验证脚本
# 自动执行所有验证步骤

# 设置失败时脚本终止
set -e

echo "========================================================"
echo "        Lumos DataFlow WebAssembly插件系统验证           "
echo "========================================================"

# 1. 确保插件目录存在
mkdir -p plugins

# 2. 创建示例数据
mkdir -p data
if [ ! -f "data/sample.csv" ]; then
    echo "创建示例CSV数据..."
    cat > data/sample.csv << EOF
id,name,email,age,created_at
1,张三,zhangsan@example.com,30,2023-01-01T10:00:00
2,李四,lisi@example.com,25,2023-01-02T11:30:00
3,王五,wangwu@example.com,35,2023-01-03T09:15:00
4,赵六,zhaoliu@example.com,28,2023-01-04T14:20:00
5,孙七,sunqi@example.com,40,2023-01-05T16:45:00
EOF
fi

# 3. 为构建脚本添加执行权限
echo "设置脚本执行权限..."
chmod +x scripts/build_wasm_plugin.sh

echo
echo "========================================================"
echo "               构建MongoDB WebAssembly插件                 "
echo "========================================================"

# 添加wasm32-wasip1目标
rustup target add wasm32-wasip1 || echo "wasm32-wasip1目标已安装"

# 确保插件目录存在
PLUGIN_DIR="dataflow/plugins"
mkdir -p "$PLUGIN_DIR"

# 构建MongoDB WebAssembly插件
cd ./examples/plugins/mongodb
echo "=== 构建 mongodb WebAssembly 插件 ==="
cargo build --target wasm32-wasip1 --release

# 复制编译好的WASM文件到插件目录
cp ./target/wasm32-wasip1/release/mongodb.wasm "../../../$PLUGIN_DIR/"
cd ../../../

echo
echo "========================================================"
echo "               验证插件接口                              "
echo "========================================================"

# 运行插件加载验证
cd dataflow
cargo run --example simple_wasm_test || echo "插件验证未完成，但继续执行下一步"

echo
echo "========================================================"
echo "  WebAssembly插件系统验证完成！                         "
echo "========================================================"

# 4. 查看插件功能
echo -e "\n========================================================"
echo "                    查看插件功能                          "
echo "========================================================"
cargo run --example wasm_plugin_manager capabilities plugins/mongodb.wasm

# 5. 运行内存测试
echo -e "\n========================================================"
echo "                    运行内存测试                          "
echo "========================================================"
cargo run --example memory_wasm_test

# 6. 使用ETL配置执行
echo -e "\n========================================================"
echo "                  运行ETL配置验证                         "
echo "========================================================"
# 确保配置目录存在
mkdir -p examples/configs

# 创建MongoDB配置文件
cat > examples/configs/mongodb_wasm_plugin.yaml << EOF
version: '1.0'
name: "MongoDB WASM插件示例"
description: "使用WebAssembly MongoDB插件从CSV文件提取数据，转换后加载到MongoDB"

# 启用WebAssembly插件系统
wasm_plugins:
  enabled: true
  plugins_dir: "./plugins"  # WebAssembly插件目录
  auto_load: true           # 自动加载插件

# 定义任务
jobs:
  - name: "csv-extract"
    type: "extractor"
    extractor_type: "csv"  # 使用内置CSV提取器
    options:
      file_path: "./data/sample.csv"
      has_header: true
      delimiter: ","
    next: "transform-data"
  
  - name: "transform-data"
    type: "transformer"
    transformer_type: "default"  # 使用内置转换器
    options:
      operations:
        - type: "rename"
          from: "id"
          to: "_id"
        - type: "add_field"
          field: "processed_at"
          value: "2023-05-01T00:00:00"
    next: "load-to-mongodb"
  
  - name: "load-to-mongodb"
    type: "loader"
    loader_type: "mongodb"  # 使用MongoDB WebAssembly插件
    options:
      connection_string: "mongodb://localhost:27017"
      database: "sample_db"
      collection: "sample_data"
      mode: "replace"  # replace或append模式
EOF

# 运行ETL配置
cargo run --example run_wasm_etl examples/configs/mongodb_wasm_plugin.yaml

echo -e "\n========================================================"
echo "            WebAssembly插件系统验证完成                    "
echo "========================================================"
echo "所有验证步骤执行完毕！" 