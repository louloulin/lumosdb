use std::path::Path;
use std::fs;
use lumos_server::db::DbExecutor;

#[tokio::test]
async fn test_basic_db_operations() {
    // 设置测试数据库
    let db_path = "test_db.sqlite";
    
    // 确保测试开始前删除可能存在的测试数据库
    if Path::new(db_path).exists() {
        fs::remove_file(db_path).expect("Failed to remove existing test database");
    }
    
    // 创建数据库执行器
    let executor = DbExecutor::new(db_path).expect("Failed to create database executor");
    
    // 创建测试表
    let create_table_sql = "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)";
    executor.execute_sql(create_table_sql.to_string()).await.expect("Failed to create test table");
    
    // 插入测试数据
    let insert_sql = "INSERT INTO test_table (name, value) VALUES ('test1', 100), ('test2', 200), ('test3', 300)";
    executor.execute_sql(insert_sql.to_string()).await.expect("Failed to insert test data");
    
    // 查询数据
    let query_sql = "SELECT * FROM test_table ORDER BY id";
    let results = executor.query(query_sql.to_string()).await.expect("Failed to query data");
    
    // 验证结果
    assert_eq!(results.len(), 3, "Expected 3 rows in query results");
    
    // 验证第一行数据
    let first_row = &results[0];
    assert_eq!(first_row.get("id").unwrap().as_u64().unwrap(), 1);
    assert_eq!(first_row.get("name").unwrap().as_str().unwrap(), "test1");
    assert_eq!(first_row.get("value").unwrap().as_u64().unwrap(), 100);
    
    // 更新数据
    let update_sql = "UPDATE test_table SET value = 150 WHERE name = 'test1'";
    executor.execute_sql(update_sql.to_string()).await.expect("Failed to update data");
    
    // 查询更新后的数据
    let query_sql = "SELECT * FROM test_table WHERE name = 'test1'";
    let results = executor.query(query_sql.to_string()).await.expect("Failed to query updated data");
    
    // 验证更新结果
    assert_eq!(results.len(), 1, "Expected 1 row in query results after update");
    let updated_row = &results[0];
    assert_eq!(updated_row.get("value").unwrap().as_u64().unwrap(), 150);
    
    // 删除数据
    let delete_sql = "DELETE FROM test_table WHERE name = 'test2'";
    executor.execute_sql(delete_sql.to_string()).await.expect("Failed to delete data");
    
    // 查询所有数据确认删除结果
    let query_sql = "SELECT * FROM test_table ORDER BY id";
    let results = executor.query(query_sql.to_string()).await.expect("Failed to query after delete");
    
    // 验证删除结果
    assert_eq!(results.len(), 2, "Expected 2 rows after deletion");
    
    // 清理测试数据
    if Path::new(db_path).exists() {
        fs::remove_file(db_path).expect("Failed to remove test database");
    }
}

#[tokio::test]
async fn test_transaction_operations() {
    // 设置测试数据库
    let db_path = "test_transaction_db.sqlite";
    
    // 确保测试开始前删除可能存在的测试数据库
    if Path::new(db_path).exists() {
        fs::remove_file(db_path).expect("Failed to remove existing test database");
    }
    
    // 创建数据库执行器
    let executor = DbExecutor::new(db_path).expect("Failed to create database executor");
    
    // 创建测试表
    let create_table_sql = "CREATE TABLE transaction_test (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)";
    executor.execute_sql(create_table_sql.to_string()).await.expect("Failed to create test table");
    
    // 测试成功的事务
    {
        let mut transaction = executor.begin_transaction().await.expect("Failed to begin transaction");
        
        // 在事务中插入数据
        let insert_sql = "INSERT INTO transaction_test (name, value) VALUES ('txn_test1', 100)";
        transaction.execute_sql(insert_sql.to_string()).await.expect("Failed to insert in transaction");
        
        // 提交事务
        transaction.commit().await.expect("Failed to commit transaction");
    }
    
    // 验证事务提交的结果
    let query_sql = "SELECT * FROM transaction_test";
    let results = executor.query(query_sql.to_string()).await.expect("Failed to query after transaction");
    assert_eq!(results.len(), 1, "Expected 1 row after committed transaction");
    
    // 测试回滚的事务
    {
        let mut transaction = executor.begin_transaction().await.expect("Failed to begin transaction");
        
        // 在事务中插入数据
        let insert_sql = "INSERT INTO transaction_test (name, value) VALUES ('txn_test2', 200)";
        transaction.execute_sql(insert_sql.to_string()).await.expect("Failed to insert in transaction");
        
        // 回滚事务
        transaction.rollback().await.expect("Failed to rollback transaction");
    }
    
    // 验证事务回滚的结果
    let query_sql = "SELECT * FROM transaction_test";
    let results = executor.query(query_sql.to_string()).await.expect("Failed to query after transaction rollback");
    assert_eq!(results.len(), 1, "Expected still 1 row after rolled back transaction");
    
    // 清理测试数据
    if Path::new(db_path).exists() {
        fs::remove_file(db_path).expect("Failed to remove test database");
    }
}
