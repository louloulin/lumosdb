import { LumosDBClient } from '../index';
import { Row } from '../types/db';
import { SearchResult } from '../types/vector';

async function main() {
  try {
    // 创建客户端实例
    const client = new LumosDBClient('http://127.0.0.1:8080');
    console.log('LumosDB 客户端已初始化');

    // 健康检查 - 成功
    console.log('\n===== 健康检查 =====');
    const health = await client.health.check();
    console.log('服务状态:', health.status);
    console.log('版本:', health.version);
    console.log('运行时间:', health.uptime, '秒');
    
    // 数据库操作 - 部分成功
    console.log('\n===== 数据库操作 =====');
    
    // 获取所有表 - 成功
    console.log('\n>> 获取所有表');
    const tables = await client.db.getTables();
    console.log('表列表:', tables);
    
    // 测试创建表 - 成功
    if (!tables.includes('test_table_new')) {
      console.log('\n>> 创建新表');
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS test_table_new (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          value REAL
        )
      `;
      await client.db.createTable(createTableSQL);
      console.log('表创建成功');
      
      // 验证表是否创建 - 成功
      console.log('\n>> 检查表是否创建');
      const tablesAfterCreate = await client.db.getTables();
      console.log('更新的表列表:', tablesAfterCreate);
    }
    
    // 查询已有数据 - 成功
    console.log('\n>> 查询数据');
    const result = await client.db.query('SELECT * FROM test_users');
    console.log('查询结果:');
    console.log('列:', result.columns);
    console.log('行数:', result.count);
    console.log('数据:');
    result.rows.forEach((row: Row) => {
      console.log(row);
    });
    
    // 获取表结构 - 成功
    console.log('\n>> 获取表结构');
    const tableInfo = await client.db.getTableInfo('test_users');
    console.log('表名:', tableInfo.name);
    console.log('列:');
    tableInfo.columns.forEach((column) => {
      console.log(`  ${column.name} (${column.type || 'unknown'})${column.pk ? ' PRIMARY KEY' : ''}${!column.notnull ? '' : ' NOT NULL'}`);
    });
    
    // 总结测试结果
    console.log('\n===== 测试总结 =====');
    console.log('成功功能:');
    console.log('- 健康检查 API');
    console.log('- 获取表列表');
    console.log('- 创建表');
    console.log('- 查询表数据');
    console.log('- 获取表结构');
    
    console.log('\n需要修复的功能:');
    console.log('- 插入/更新数据 (可能需要调整参数格式)');
    console.log('- 向量操作 (API端点配置可能有问题)');
    
  } catch (error) {
    console.error('发生错误:', error);
  }
}

main();