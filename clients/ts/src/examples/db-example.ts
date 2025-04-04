import { LumosDBClient } from '../index';

/**
 * 演示如何使用LumosDB客户端进行数据库操作
 * 包含表管理、查询执行、错误处理和特殊字符处理
 */
async function dbClientExample() {
  try {
    // 初始化客户端
    const client = new LumosDBClient('http://localhost:8080');
    
    // 获取数据库客户端
    const dbClient = client.db;
    
    console.log('=== 表管理操作 ===');
    
    // 获取所有表
    console.log('获取所有表...');
    const tables = await dbClient.getTables();
    console.log(`数据库中有 ${tables.length} 个表: ${tables.join(', ')}`);
    
    // 创建测试表 (如果不存在)
    const testTableName = 'test_table_' + Date.now();
    
    if (!(await dbClient.tableExists(testTableName))) {
      console.log(`创建新表: ${testTableName}`);
      await dbClient.createTable(`
        CREATE TABLE "${testTableName}" (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          age INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('表创建成功');
    }
    
    // 获取表信息
    console.log(`获取表 ${testTableName} 的信息...`);
    const tableInfo = await dbClient.getTableInfo(testTableName);
    console.log('表结构:', tableInfo.columns);
    
    console.log('\n=== 数据操作 ===');
    
    // 使用executeSql自动选择正确的方法 (execute)
    console.log('插入测试数据...');
    for (let i = 1; i <= 5; i++) {
      await dbClient.executeSql(
        `INSERT INTO "${testTableName}" (id, name, age) VALUES (?, ?, ?)`,
        [i, `用户${i}`, 20 + i]
      );
    }
    console.log('数据插入成功');
    
    // 使用executeSql自动选择正确的方法 (query)
    console.log('查询数据...');
    const result = await dbClient.executeSql(
      `SELECT * FROM "${testTableName}" ORDER BY id`
    );
    console.log('查询结果:');
    
    // 使用类型守卫检查结果类型是否包含rows属性
    if ('rows' in result) {
      console.table(result.rows);
    } else {
      console.log('返回的结果不包含行数据');
    }
    
    // 演示错误处理
    console.log('\n=== 错误处理 ===');
    
    try {
      console.log('尝试查询不存在的表...');
      await dbClient.query('SELECT * FROM non_existent_table');
    } catch (error) {
      console.error('预期的错误:', (error as Error).message);
    }
    
    try {
      console.log('尝试使用execute执行SELECT查询...');
      await dbClient.execute('SELECT * FROM ' + testTableName);
    } catch (error) {
      console.error('预期的错误:', (error as Error).message);
    }
    
    // 处理特殊字符和Unicode
    console.log('\n=== 特殊字符处理 ===');
    
    const specialTableName = 'test_特殊_表';
    
    // 检查表是否存在
    if (await dbClient.tableExists(specialTableName)) {
      console.log(`删除已存在的表: ${specialTableName}`);
      await dbClient.dropTable(specialTableName);
    }
    
    // 创建包含特殊字符的表名
    console.log(`创建包含Unicode字符的表: ${specialTableName}`);
    await dbClient.createTable(`
      CREATE TABLE "${specialTableName}" (
        id INTEGER PRIMARY KEY,
        中文列名 TEXT,
        特殊_字段 INTEGER
      )
    `);
    
    // 获取表信息
    const specialTableInfo = await dbClient.getTableInfo(specialTableName);
    console.log('特殊表结构:', specialTableInfo.columns);
    
    // 插入和查询数据
    console.log('向特殊表插入数据...');
    await dbClient.execute(
      `INSERT INTO "${specialTableName}" (id, 中文列名, 特殊_字段) VALUES (?, ?, ?)`,
      [1, '你好世界', 42]
    );
    
    const specialResult = await dbClient.query(`SELECT * FROM "${specialTableName}"`);
    console.log('特殊表查询结果:');
    console.table(specialResult.rows);
    
    // 清理
    console.log('\n=== 清理 ===');
    
    console.log(`删除测试表: ${testTableName}`);
    await dbClient.dropTable(testTableName);
    
    console.log(`删除特殊表: ${specialTableName}`);
    await dbClient.dropTable(specialTableName);
    
    console.log('示例运行完成');
    
  } catch (error) {
    console.error('示例运行出错:', error);
  }
}

// 运行示例
dbClientExample().catch(console.error); 