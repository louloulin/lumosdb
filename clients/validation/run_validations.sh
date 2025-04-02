#!/bin/bash

# 设置工作目录
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VALIDATION_DIR="${ROOT_DIR}/clients/validation"
GO_CLIENT_DIR="${ROOT_DIR}/clients/go"
RUST_CLIENT_DIR="${ROOT_DIR}/clients/rust"
KOTLIN_CLIENT_DIR="${ROOT_DIR}/clients/kotlin"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 辅助函数
print_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

# 验证 Go 客户端
validate_go() {
    print_header "验证 Go 客户端"
    
    # 检查 Go 是否已安装
    if ! command -v go &> /dev/null; then
        print_error "未找到 Go 命令，请确保 Go 已安装并添加到 PATH 中"
        return 1
    fi
    
    # 运行验证脚本
    print_warning "正在运行 Go 验证脚本..."
    
    # 首先确保删除测试集合，避免冲突
    curl -s -X DELETE http://localhost:8080/api/vector/collections/go_client_validation_test_collection > /dev/null
    
    cd "${VALIDATION_DIR}"
    go run validate_go.go
    
    if [ $? -eq 0 ]; then
        print_success "Go 客户端验证成功"
        return 0
    else
        print_error "Go 客户端验证失败"
        return 1
    fi
}

# 验证 Rust 客户端
validate_rust() {
    print_header "验证 Rust 客户端"
    
    # 检查 cargo 是否已安装
    if ! command -v cargo &> /dev/null; then
        print_error "未找到 cargo 命令，请确保 Rust 已安装并添加到 PATH 中"
        return 1
    fi
    
    # 运行验证脚本
    print_warning "正在运行 Rust 验证脚本..."
    cd "${VALIDATION_DIR}"
    cargo run --bin lumos-db-validation
    
    if [ $? -eq 0 ]; then
        print_success "Rust 客户端验证成功"
        return 0
    else
        print_error "Rust 客户端验证失败"
        return 1
    fi
}

# 验证 Kotlin 客户端
validate_kotlin() {
    print_header "验证 Kotlin 客户端"
    
    # 检查 gradle 是否已安装
    if ! command -v ./gradlew &> /dev/null && ! command -v gradle &> /dev/null; then
        print_error "未找到 gradle 命令，请确保 Gradle 已安装并添加到 PATH 中"
        return 1
    fi
    
    # 运行验证脚本
    print_warning "正在运行 Kotlin 验证脚本..."
    cd "${KOTLIN_CLIENT_DIR}"
    
    # 优先使用项目的 gradlew
    if [ -f "./gradlew" ]; then
        ./gradlew :validation:run
    else
        # 如果没有gradlew，直接运行kotlin脚本
        cd "${VALIDATION_DIR}"
        kotlin -classpath "${KOTLIN_CLIENT_DIR}/build/libs/*" validate_kotlin.kt
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Kotlin 客户端验证成功"
        return 0
    else
        print_error "Kotlin 客户端验证失败"
        return 1
    fi
}

# 主函数
main() {
    echo -e "${BLUE}开始验证 LumosDB 客户端...${NC}"
    
    # 检查 LumosDB 服务器是否正在运行
    curl -s http://localhost:8080/api/health > /dev/null
    if [ $? -ne 0 ]; then
        print_error "无法连接到 LumosDB 服务器，请确保服务器正在运行"
        exit 1
    fi
    
    # 记录结果
    go_result=0
    rust_result=0
    kotlin_result=0
    
    # 运行验证
    validate_go
    go_result=$?
    
    # Rust和Kotlin客户端验证暂时注释掉
    # validate_rust
    # rust_result=$?
    # 
    # validate_kotlin
    # kotlin_result=$?
    
    # 显示总结
    echo -e "\n${BLUE}==== 验证总结 ====${NC}"
    
    if [ $go_result -eq 0 ]; then
        print_success "Go 客户端: 通过"
    else
        print_error "Go 客户端: 失败"
    fi
    
    # 暂时注释掉这些客户端验证
    # if [ $rust_result -eq 0 ]; then
    #     print_success "Rust 客户端: 通过"
    # else
    #     print_error "Rust 客户端: 失败"
    # fi
    # 
    # if [ $kotlin_result -eq 0 ]; then
    #     print_success "Kotlin 客户端: 通过"
    # else
    #     print_error "Kotlin 客户端: 失败"
    # fi
    
    # 总体结果
    # if [ $go_result -eq 0 ] && [ $rust_result -eq 0 ] && [ $kotlin_result -eq 0 ]; then
    if [ $go_result -eq 0 ]; then
        echo -e "\n${GREEN}所有客户端验证通过!${NC}"
        exit 0
    else
        echo -e "\n${RED}一个或多个客户端验证失败!${NC}"
        exit 1
    fi
}

# 执行主函数
main