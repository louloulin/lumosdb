fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=Cargo.toml");
    
    // 设置CXXFLAGS环境变量以忽略模板警告
    if cfg!(target_os = "macos") {
        println!("cargo:rustc-env=CXXFLAGS=-Wno-missing-template-arg-list-after-template-kw");
    }
    
    // Allow specific duckdb linking
    println!("cargo:rustc-link-lib=static=duckdb");
    
    // Use bundled SQLite
    println!("cargo:rustc-cfg=feature=\"bundled\"");
} 