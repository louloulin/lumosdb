"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
async function main() {
    try {
        // 创建客户端实例
        const client = new index_1.LumosDBClient('http://127.0.0.1:8080');
        console.log('LumosDB 客户端已初始化');
        // 健康检查
        console.log('\n===== 健康检查 =====');
        const health = await client.health.check();
        console.log('服务状态:', health.status);
        console.log('版本:', health.version);
        console.log('运行时间:', health.uptime, '秒');
        // 数据库操作
        console.log('\n===== 数据库操作 =====');
        // 获取所有表
        console.log('\n>> 获取所有表');
        const tables = await client.db.getTables();
        console.log('表列表:', tables);
        // 创建一个新表
        console.log('\n>> 创建新表');
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS test_users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER,
        email TEXT
      )
    `;
        await client.db.createTable(createTableSQL);
        console.log('表创建成功');
        // 验证表是否创建
        console.log('\n>> 检查表是否创建');
        const tablesAfterCreate = await client.db.getTables();
        console.log('更新的表列表:', tablesAfterCreate);
        // 插入数据
        console.log('\n>> 插入数据');
        await client.db.execute('INSERT INTO test_users (id, name, age, email) VALUES (?, ?, ?, ?)', [1, 'John Doe', 30, 'john@example.com']);
        await client.db.execute('INSERT INTO test_users (id, name, age, email) VALUES (?, ?, ?, ?)', [2, 'Jane Smith', 25, 'jane@example.com']);
        console.log('数据插入成功');
        // 查询数据
        console.log('\n>> 查询数据');
        const result = await client.db.query('SELECT * FROM test_users');
        console.log('查询结果:');
        console.log('列:', result.columns);
        console.log('行数:', result.count);
        console.log('数据:');
        result.rows.forEach((row) => {
            console.log(row);
        });
        // 获取表结构
        console.log('\n>> 获取表结构');
        const tableInfo = await client.db.getTableInfo('test_users');
        console.log('表名:', tableInfo.name);
        console.log('列:');
        tableInfo.columns.forEach((column) => {
            console.log(`  ${column.name} (${column.type})${column.pk ? ' PRIMARY KEY' : ''}${column.notnull ? ' NOT NULL' : ''}`);
        });
        // 向量操作
        console.log('\n===== 向量操作 =====');
        // 获取所有集合
        console.log('\n>> 获取所有向量集合');
        try {
            const collections = await client.vector.getCollections();
            console.log('集合列表:', collections);
            // 创建向量集合
            console.log('\n>> 创建向量集合');
            const collectionName = 'test_docs';
            const dimension = 3; // 简化示例使用小维度
            try {
                await client.vector.createCollection(collectionName, dimension);
                console.log(`集合 ${collectionName} 创建成功`);
                // 添加向量
                console.log('\n>> 添加向量');
                await client.vector.addVector(collectionName, {
                    id: 'doc1',
                    values: [0.1, 0.2, 0.3],
                    metadata: { title: 'Document 1', category: 'test' }
                });
                console.log('向量添加成功');
                // 批量添加向量
                console.log('\n>> 批量添加向量');
                await client.vector.addVectors(collectionName, [
                    {
                        id: 'doc2',
                        values: [0.4, 0.5, 0.6],
                        metadata: { title: 'Document 2', category: 'test' }
                    },
                    {
                        id: 'doc3',
                        values: [0.7, 0.8, 0.9],
                        metadata: { title: 'Document 3', category: 'another' }
                    }
                ]);
                console.log('批量向量添加成功');
                // 搜索向量
                console.log('\n>> 搜索向量');
                const searchResults = await client.vector.search(collectionName, [0.1, 0.2, 0.3], 2);
                console.log('搜索结果:');
                searchResults.forEach((result) => {
                    console.log(`  ID: ${result.id}, 得分: ${result.score}`);
                    console.log(`  元数据:`, result.metadata);
                });
            }
            catch (vectorError) {
                console.error('向量操作错误:', vectorError);
            }
        }
        catch (vectorError) {
            console.error('向量操作不可用:', vectorError);
        }
        console.log('\n===== 测试完成 =====');
    }
    catch (error) {
        console.error('发生错误:', error);
    }
}
main();
