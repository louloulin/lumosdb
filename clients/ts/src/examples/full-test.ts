import { LumosDBClient } from '../index';
import { Row } from '../types/db';
import { Vector } from '../types/vector';

async function main() {
  try {
    console.log('===== LumosDB 客户端完整功能测试 =====');
    
    // 初始化客户端
    const client = new LumosDBClient('http://127.0.0.1:8080');
    console.log('客户端初始化成功');
    
    // 1. 健康检查
    console.log('\n----- 1. 健康检查 -----');
    try {
      const health = await client.health.check();
      console.log('健康状态:', health.status);
      console.log('版本:', health.version);
      console.log('运行时间:', health.uptime, '秒');
      console.log('✓ 健康检查成功');
    } catch (error) {
      console.error('✗ 健康检查失败:', error);
    }
    
    // 2. 数据库操作
    console.log('\n----- 2. 数据库操作 -----');
    
    // 2.1 获取表列表
    console.log('\n>> 2.1 获取表列表');
    let tables = [];
    try {
      tables = await client.db.getTables();
      console.log('表列表:', tables);
      console.log('✓ 获取表列表成功');
    } catch (error) {
      console.error('✗ 获取表列表失败:', error);
    }
    
    // 2.2 创建测试表
    const testTableName = 'ts_client_test';
    console.log(`\n>> 2.2 创建测试表: ${testTableName}`);
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${testTableName} (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          value REAL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await client.db.execute(createTableSQL);
      console.log('✓ 创建表成功');
      
      // 验证表是否创建
      const tablesAfter = await client.db.getTables();
      if (tablesAfter.includes(testTableName)) {
        console.log('✓ 验证表创建成功');
      } else {
        console.log('✗ 验证表创建失败，表未找到');
      }
    } catch (error) {
      console.error('✗ 创建表失败:', error);
    }
    
    // 2.3 插入数据
    console.log(`\n>> 2.3 插入数据到表: ${testTableName}`);
    try {
      const insertSQL = `
        INSERT INTO ${testTableName} (id, name, value) 
        VALUES (?, ?, ?)
      `;
      const result = await client.db.execute(insertSQL, [1, 'test_item', 99.9]);
      console.log('插入结果:', result);
      console.log('✓ 插入数据成功');
    } catch (error) {
      console.error('✗ 插入数据失败:', error);
    }
    
    // 2.4 查询数据
    console.log(`\n>> 2.4 查询数据从表: ${testTableName}`);
    try {
      const result = await client.db.query(`SELECT * FROM ${testTableName}`);
      console.log('查询结果:');
      console.log('列:', result.columns);
      console.log('行数:', result.count);
      console.log('数据:');
      result.rows.forEach((row) => {
        console.log(row);
      });
      console.log('✓ 查询数据成功');
    } catch (error) {
      console.error('✗ 查询数据失败:', error);
    }
    
    // 2.5 更新数据
    console.log(`\n>> 2.5 更新数据在表: ${testTableName}`);
    try {
      const updateSQL = `
        UPDATE ${testTableName}
        SET value = ?, name = ?
        WHERE id = ?
      `;
      const result = await client.db.execute(updateSQL, [199.9, 'updated_item', 1]);
      console.log('更新结果:', result);
      console.log('✓ 更新数据成功');
      
      // 验证更新
      const updatedData = await client.db.query(`SELECT * FROM ${testTableName} WHERE id = 1`);
      console.log('更新后数据:', updatedData.rows);
    } catch (error) {
      console.error('✗ 更新数据失败:', error);
    }
    
    // 2.6 获取表结构
    console.log(`\n>> 2.6 获取表结构: ${testTableName}`);
    try {
      const tableInfo = await client.db.getTableInfo(testTableName);
      console.log('表名:', tableInfo.name);
      console.log('列:');
      tableInfo.columns.forEach((column) => {
        console.log(`  ${column.name} (${column.type || 'unknown'})${column.pk ? ' PRIMARY KEY' : ''}${!column.notnull ? '' : ' NOT NULL'}`);
      });
      console.log('✓ 获取表结构成功');
    } catch (error) {
      console.error('✗ 获取表结构失败:', error);
    }
    
    // 3. 向量操作
    console.log('\n----- 3. 向量操作 -----');
    
    // 3.1 获取向量集合列表
    console.log('\n>> 3.1 获取向量集合列表');
    let collections = [];
    try {
      collections = await client.vector.getCollections();
      console.log('向量集合列表:', collections);
      console.log('✓ 获取向量集合列表成功');
    } catch (error) {
      console.error('✗ 获取向量集合列表失败:', error);
    }
    
    // 3.2 创建向量集合
    const testCollectionName = 'ts_client_test_collection';
    console.log(`\n>> 3.2 创建向量集合: ${testCollectionName}`);
    try {
      await client.vector.createCollection(testCollectionName, 4);
      console.log('✓ 创建向量集合成功');
      
      // 验证集合是否创建
      const collectionsAfter = await client.vector.getCollections();
      const created = collectionsAfter.some(c => c.name === testCollectionName);
      if (created) {
        console.log('✓ 验证向量集合创建成功');
      } else {
        console.log('✗ 验证向量集合创建失败，集合未找到');
      }
    } catch (error) {
      console.error('✗ 创建向量集合失败:', error);
    }
    
    // 3.3 获取集合信息
    console.log(`\n>> 3.3 获取向量集合信息: ${testCollectionName}`);
    try {
      const collectionInfo = await client.vector.getCollection(testCollectionName);
      console.log('集合信息:', collectionInfo);
      console.log('✓ 获取向量集合信息成功');
    } catch (error) {
      console.error('✗ 获取向量集合信息失败:', error);
    }
    
    // 3.4 添加向量
    console.log(`\n>> 3.4 添加向量到集合: ${testCollectionName}`);
    try {
      // 使用addEmbeddings方法添加向量
      const ids = ['test1', 'test2', 'test3'];
      const embeddings = [
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0]
      ];
      const metadata = [
        { desc: 'test vector 1' },
        { desc: 'test vector 2' },
        { desc: 'test vector 3' }
      ];
      
      await client.vector.addEmbeddings(testCollectionName, ids, embeddings, metadata);
      console.log('✓ 添加向量成功');
    } catch (error) {
      console.error('✗ 添加向量失败:', error);
    }
    
    // 3.5 向量搜索
    console.log(`\n>> 3.5 向量搜索: ${testCollectionName}`);
    try {
      const searchResults = await client.vector.search(
        testCollectionName,
        [0.5, 0.5, 0.0, 0.0], // 查询向量
        2 // 返回前2个结果
      );
      console.log('搜索结果:', searchResults);
      console.log('✓ 向量搜索成功');
    } catch (error) {
      console.error('✗ 向量搜索失败:', error);
    }
    
    // 4. 删除操作（清理测试数据）
    console.log('\n----- 4. 删除操作（清理测试数据） -----');
    
    // 4.1 删除表
    console.log(`\n>> 4.1 删除测试表: ${testTableName}`);
    try {
      await client.db.execute(`DROP TABLE IF EXISTS ${testTableName}`);
      console.log('✓ 删除表成功');
      
      // 验证表是否删除
      const tablesAfterDrop = await client.db.getTables();
      if (!tablesAfterDrop.includes(testTableName)) {
        console.log('✓ 验证表删除成功');
      } else {
        console.log('✗ 验证表删除失败，表仍然存在');
      }
    } catch (error) {
      console.error('✗ 删除表失败:', error);
    }
    
    // 4.2 删除向量集合
    console.log(`\n>> 4.2 删除向量集合: ${testCollectionName}`);
    try {
      await client.vector.deleteCollection(testCollectionName);
      console.log('✓ 删除向量集合成功');
      
      // 验证集合是否删除
      const collectionsAfterDrop = await client.vector.getCollections();
      const stillExists = collectionsAfterDrop.some(c => c.name === testCollectionName);
      if (!stillExists) {
        console.log('✓ 验证向量集合删除成功');
      } else {
        console.log('✗ 验证向量集合删除失败，集合仍然存在');
      }
    } catch (error) {
      console.error('✗ 删除向量集合失败:', error);
    }
    
    // 测试总结
    console.log('\n===== 测试总结 =====');
    console.log('所有测试已完成，请检查上述输出确认每个功能的工作状态。');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

main(); 