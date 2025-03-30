#!/bin/bash
# WebAssembly插件构建脚本
# 用法: ./scripts/build_wasm_plugin.sh <plugin_dir>
# 例如: ./scripts/build_wasm_plugin.sh examples/plugins/mongodb

set -e

# 检查参数
if [ $# -lt 1 ]; then
    echo "用法: $0 <plugin_dir>"
    echo "例如: $0 examples/plugins/mongodb"
    exit 1
fi

PLUGIN_DIR="$1"
PLUGIN_NAME=$(basename "$PLUGIN_DIR")
PLUGINS_DIR="plugins"

echo "=== 构建 $PLUGIN_NAME WebAssembly 插件 ==="

# 确保插件目录存在
if [ ! -d "$PLUGIN_DIR" ]; then
    echo "错误: 插件目录 '$PLUGIN_DIR' 不存在"
    exit 1
fi

# 确保插件目录中有Cargo.toml
if [ ! -f "$PLUGIN_DIR/Cargo.toml" ]; then
    echo "错误: 插件Cargo.toml不存在于 '$PLUGIN_DIR'"
    exit 1
fi

# 确保plugins目录存在
mkdir -p "$PLUGINS_DIR"

# 在插件目录中构建WebAssembly
cd "$PLUGIN_DIR"

# 确保wasm32-wasi目标已添加
rustup target add wasm32-wasi

# 构建为WebAssembly
echo "编译 $PLUGIN_NAME 到 WebAssembly..."
cargo build --release --target wasm32-wasi

# 找到构建的wasm文件
cd ../..
WASM_FILE=$(find target/wasm32-wasi/release -name "*.wasm" | grep -i "$PLUGIN_NAME" | head -1)

if [ -z "$WASM_FILE" ]; then
    echo "错误: 无法找到构建的WASM文件"
    exit 1
fi

# 复制到plugins目录
cp "$WASM_FILE" "$PLUGINS_DIR/${PLUGIN_NAME}.wasm"

echo "=== 插件构建完成 ==="
echo "WebAssembly插件已保存到: $PLUGINS_DIR/${PLUGIN_NAME}.wasm"

# 执行验证
if [ -f "target/debug/examples/validate_wasm_plugin" ]; then
    echo "=== 验证插件 ==="
    ./target/debug/examples/validate_wasm_plugin "$PLUGINS_DIR/${PLUGIN_NAME}.wasm"
else
    echo "=== 构建验证工具 ==="
    cargo build --example validate_wasm_plugin
    
    echo "=== 验证插件 ==="
    ./target/debug/examples/validate_wasm_plugin "$PLUGINS_DIR/${PLUGIN_NAME}.wasm"
fi 