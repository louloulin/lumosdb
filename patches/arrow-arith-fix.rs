// 修复arrow-arith中quarter()方法的冲突问题
// 用于替换arrow-arith-42.0.0/src/temporal.rs中的相关代码

// 使用完全限定语法（Fully Qualified Syntax）来解决chrono::Datelike和ChronoDateExt中quarter方法的冲突
// 替换262行：time_fraction_dyn(array, "quarter", |t| t.quarter() as i32)
time_fraction_dyn(array, "quarter", |t| chrono::Datelike::quarter(&t) as i32)

// 替换272行：time_fraction_internal(array, "quarter", |t| t.quarter() as i32)
time_fraction_internal(array, "quarter", |t| chrono::Datelike::quarter(&t) as i32) 