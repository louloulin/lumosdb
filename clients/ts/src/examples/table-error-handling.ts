import { LumosDBClient } from '../index';

/**
 * 此示例用于测试LumosDB客户端对各种表操作错误的处理
 * 包括:
 * - 表不存在错误
 * - execute与query的正确用途
 * - SQL语法错误
 * - 表名包含特殊字符的处理
 */
async function main() {
  try {
    // 创建客户端实例
    const client = new LumosDBClient('http://127.0.0.1:8080');
    console.log('LumosDB 客户端已初始化');

    // 测试表不存在的情况
    console.log('\n===== 测试 1: 表不存在错误 =====');
    try {
      const nonExistentTable = 'non_existent_table_' + Date.now();
      const tableInfo = await client.db.getTableInfo(nonExistentTable);
      
      // 检查是否返回了空表结构
      if (tableInfo && (!tableInfo.columns || tableInfo.columns.length === 0)) {
        console.log('✅ 服务器返回了空表信息，表示表不存在:', tableInfo);
      } else {
        console.log('❌ 错误: 应该返回空表信息，但获取到了:', tableInfo);
      }
    } catch (error: unknown) {
      // 这里会捕获API抛出的错误
      const errorMessage = getErrorMessage(error);
      console.log('✅ 正确捕获到表不存在错误:', errorMessage);
    }

    // 测试execute和query的使用区别
    console.log('\n===== 测试 2: Execute 和 Query 的正确用途 =====');
    try {
      // 错误: 使用execute执行SELECT查询
      console.log('>> 测试使用execute执行SELECT查询 (应该失败)');
      const selectResult = await client.db.execute('SELECT 1 as test');
      console.log('❌ 错误: 应该抛出错误，但获取到了结果:', selectResult);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.log('✅ 正确捕获到execute执行SELECT的错误:', errorMessage);
    }

    // 使用query执行SELECT查询 (应成功)
    try {
      console.log('>> 测试使用query执行SELECT查询 (应该成功)');
      const queryResult = await client.db.query('SELECT 1 as test');
      console.log('✅ 正确使用query执行SELECT查询:', queryResult);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.log('❌ 错误: query执行SELECT应成功但失败了:', errorMessage);
    }

    // 测试创建包含空格的表名
    console.log('\n===== 测试 3: 带空格的表名处理 =====');
    const tableWithSpaces = 'test table with spaces ' + Date.now();
    const quotedTableName = `"${tableWithSpaces}"`;

    // 创建带空格的表
    try {
      console.log(`>> 创建带空格的表: ${tableWithSpaces}`);
      await client.db.execute(`CREATE TABLE ${quotedTableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      console.log('✅ 成功创建带空格的表');

      // 验证表是否创建成功
      const tables = await client.db.getTables();
      if (tables.includes(tableWithSpaces)) {
        console.log('✅ 表名正确返回在表列表中');
      } else {
        console.log('❌ 表名未在表列表中找到');
        console.log('当前表列表:', tables);
      }

      // 插入数据到带空格的表
      console.log(`>> 向带空格的表插入数据`);
      await client.db.execute(`INSERT INTO ${quotedTableName} (id, name) VALUES (1, 'test')`);
      console.log('✅ 成功插入数据到带空格的表');

      // 查询带空格的表
      console.log(`>> 从带空格的表查询数据`);
      const queryResult = await client.db.query(`SELECT * FROM ${quotedTableName}`);
      console.log('✅ 成功查询带空格的表:', queryResult);

      // 清理: 删除带空格的表
      console.log(`>> 删除带空格的表`);
      await client.db.execute(`DROP TABLE ${quotedTableName}`);
      console.log('✅ 成功删除带空格的表');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.log('❌ 处理带空格表名失败:', errorMessage);
    }

    // 测试SQL语法错误
    console.log('\n===== 测试 4: SQL语法错误处理 =====');
    try {
      // 错误的SQL: INSERT INTO但没有指定列
      const invalidSql = 'INSERT INTO test_table VALUES (1, 2, 3)';
      await client.db.execute(invalidSql);
      console.log('❌ 错误: 应该抛出SQL语法错误，但执行成功了');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.log('✅ 正确捕获到SQL语法错误:', errorMessage);
    }

    console.log('\n===== 测试完成 =====');
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error('测试过程中发生错误:', errorMessage);
  }
}

/**
 * 从各种可能的错误对象中提取错误消息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    // API错误对象可能有message或error.message
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
    
    if ('error' in error && typeof (error as any).error === 'object' && (error as any).error !== null) {
      const apiError = (error as any).error;
      if ('message' in apiError && typeof apiError.message === 'string') {
        return apiError.message;
      }
      if ('code' in apiError && typeof apiError.code === 'string') {
        return `错误代码: ${apiError.code}`;
      }
    }
    
    // 尝试序列化对象
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return '无法序列化的错误对象';
    }
  }
  
  return String(error);
}

main(); 