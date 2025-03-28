# Dependency Management Guide

## Known Issues and Resolutions

### arrow-arith and chrono Method Conflicts

#### Problem Description

There's a known issue with method name conflicts between `arrow-arith` and `chrono` libraries. Specifically, the `quarter()` method is implemented by both:

1. The `Datelike` trait for `NaiveDateTime` in the chrono crate
2. The `ChronoDateExt` trait in the arrow-arith crate

This causes ambiguity when the compiler encounters code calling the `quarter()` method, as it cannot determine which implementation to use.

The error typically looks like:
```
error[E0034]: multiple applicable items in scope
   --> src/some_file.rs:123:456
    |
123 |     let quarter = t.quarter();
    |                    ^^^^^^^
    |
    = note: candidate #1: `Datelike::quarter`
    = note: candidate #2: `ChronoDateExt::quarter`
```

#### Solution Options

We've implemented the following solutions to address this conflict:

1. **Pinned chrono version**: We've specified an exact version of chrono (`=0.4.26`) with limited features to ensure compatibility.

2. **Patched arrow-arith**: We've added a patch to use a specific version of arrow-arith that's compatible with our chrono version:
   ```toml
   [patch.crates-io]
   arrow-arith = { git = "https://github.com/apache/arrow-rs", rev = "e00e61145c21e4da0c2c3f43ed365ef0e2041f3d" }
   ```

3. **Code adaptations**: In our vector implementation, we've:
   - Used binary serialization for vectors rather than Arrow formats
   - Added explicit comments in the code about avoiding Arrow dependencies
   - Implemented our own vector math functions to reduce reliance on external libraries

#### Alternative Approaches

If you're still experiencing issues, here are additional approaches:

1. **Use fully qualified syntax** in any code that directly uses the conflicting methods:
   ```rust
   // Instead of:
   let quarter = date.quarter();
   
   // Use:
   let quarter = chrono::Datelike::quarter(&date);
   ```

2. **Disable arrow-arith entirely** if you're not using its functionality:
   ```toml
   [dependencies.arrow]
   default-features = false
   features = ["io_parquet", "io_csv", "io_json"] # exclude arrow-arith
   ```

3. **Create wrapper functions** that explicitly call the desired implementation:
   ```rust
   fn get_quarter_from_date(date: &NaiveDateTime) -> u32 {
       chrono::Datelike::quarter(date)
   }
   ```

## Best Practices for Dependency Management

1. **Pin versions** of critical dependencies to avoid unexpected breaking changes
2. **Limit features** to only those you need, reducing the dependency footprint
3. **Document conflicts** and their resolutions for future reference
4. **Use dependency analysis tools** like `cargo-audit` to check for security issues
5. **Regularly update** dependencies when safe to do so, especially for security patches 