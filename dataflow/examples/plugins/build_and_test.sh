#!/bin/bash
set -e

# 输出颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}=== Lumos DataFlow 插件构建和测试脚本 ===${NC}"

# 检查MongoDB插件目录
MONGODB_DIR="mongodb"
if [ ! -d "$MONGODB_DIR" ]; then
    echo -e "${RED}错误: 未找到MongoDB插件目录${NC}"
    exit 1
fi

# 创建插件目录
PLUGINS_DIR="../../target/plugins"
mkdir -p "$PLUGINS_DIR"

echo -e "${YELLOW}1. 构建MongoDB插件${NC}"
cd "$MONGODB_DIR"
cargo build
echo -e "${GREEN}✓ MongoDB插件构建完成${NC}"

# 复制插件到目标目录
echo -e "${YELLOW}2. 安装插件到测试目录${NC}"
if [ "$(uname)" == "Darwin" ]; then
    PLUGIN_FILE="target/debug/liblumos_dataflow_plugin_mongodb.dylib"
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    PLUGIN_FILE="target/debug/liblumos_dataflow_plugin_mongodb.so"
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ]; then
    PLUGIN_FILE="target/debug/lumos_dataflow_plugin_mongodb.dll"
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW64_NT" ]; then
    PLUGIN_FILE="target/debug/lumos_dataflow_plugin_mongodb.dll"
else
    echo -e "${RED}不支持的操作系统${NC}"
    exit 1
fi

if [ ! -f "$PLUGIN_FILE" ]; then
    echo -e "${RED}错误: 插件文件未找到: $PLUGIN_FILE${NC}"
    exit 1
fi

cp "$PLUGIN_FILE" "../../$PLUGINS_DIR/"
echo -e "${GREEN}✓ 插件复制到 $PLUGINS_DIR${NC}"

cd ../..

echo -e "${YELLOW}3. 运行插件测试${NC}"
LUMOS_PLUGINS_DIR="$PWD/target/plugins" cargo run --example test_plugins

echo -e "${BLUE}=== 测试完成 ===${NC}" 