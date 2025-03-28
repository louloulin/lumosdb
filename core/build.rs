fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=Cargo.toml");
    
    // Allow specific duckdb linking
    println!("cargo:rustc-link-lib=static=duckdb");
    
    // Use bundled SQLite
    println!("cargo:rustc-cfg=feature=\"bundled\"");
} 