#!/bin/bash

echo "开始验证 LumosDB 客户端..."

# 检查LumosDB服务器是否正在运行
echo -n "检查LumosDB服务器..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✓ 服务器正在运行"
else
    echo "❌ 服务器未运行或无法访问"
    echo "请确保LumosDB服务器已启动并运行在端口8080上"
    exit 1
fi

VALIDATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
GO_SUCCESS=false
RUST_SUCCESS=false
KOTLIN_SUCCESS=false

# 检查Go是否已安装
echo -e "\n==== 验证 Go 客户端 ===="
if command -v go &> /dev/null; then
    echo "! 正在运行 Go 验证脚本..."
    pushd "$VALIDATION_DIR" > /dev/null
    if go run validate_go.go; then
        GO_SUCCESS=true
        echo "✓ Go 客户端验证成功"
    else
        echo "❌ Go 客户端验证失败"
    fi
    popd > /dev/null
else
    echo "! Go未安装，跳过Go客户端验证"
fi

# 检查Rust/Cargo是否已安装
echo -e "\n==== 验证 Rust 客户端 ===="
if command -v cargo &> /dev/null; then
    echo "! 正在运行 Rust 验证脚本..."
    pushd "$VALIDATION_DIR" > /dev/null
    if cargo run --quiet; then
        RUST_SUCCESS=true
        echo "✓ Rust 客户端验证成功"
    else
        echo "❌ Rust 客户端验证失败"
    fi
    popd > /dev/null
else
    echo "! Cargo未安装，跳过Rust客户端验证"
fi

# 检查Kotlin/Gradle是否已安装
echo -e "\n==== 验证 Kotlin 客户端 ===="
if command -v gradle &> /dev/null || command -v ./gradlew &> /dev/null; then
    echo "! 正在运行 Kotlin 验证脚本..."
    pushd "$VALIDATION_DIR" > /dev/null
    if [ -f ./gradlew ]; then
        ./gradlew run --quiet && KOTLIN_SUCCESS=true
    elif command -v gradle &> /dev/null; then
        gradle run --quiet && KOTLIN_SUCCESS=true
    fi
    
    if [ "$KOTLIN_SUCCESS" = true ]; then
        echo "✓ Kotlin 客户端验证成功"
    else
        echo "❌ Kotlin 客户端验证失败"
    fi
    popd > /dev/null
else
    echo "! Gradle未安装，跳过Kotlin客户端验证"
fi

# 输出验证总结
echo -e "\n==== 验证总结 ===="
if [ "$GO_SUCCESS" = true ]; then
    echo "✓ Go 客户端: 通过"
else
    echo "❌ Go 客户端: 未通过或未验证"
fi

if [ "$RUST_SUCCESS" = true ]; then
    echo "✓ Rust 客户端: 通过"
else
    echo "❌ Rust 客户端: 未通过或未验证"
fi

if [ "$KOTLIN_SUCCESS" = true ]; then
    echo "✓ Kotlin 客户端: 通过"
else
    echo "❌ Kotlin 客户端: 未通过或未验证"
fi

if [ "$GO_SUCCESS" = true ] && [ "$RUST_SUCCESS" = true ] && [ "$KOTLIN_SUCCESS" = true ]; then
    echo -e "\n所有客户端验证通过!"
    exit 0
elif [ "$GO_SUCCESS" = true ] || [ "$RUST_SUCCESS" = true ] || [ "$KOTLIN_SUCCESS" = true ]; then
    echo -e "\n部分客户端验证通过"
    exit 0
else
    echo -e "\n所有客户端验证失败或未运行"
    exit 1
fi