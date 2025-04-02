import { LumosDBClient } from '../index';
import { SearchResult, Vector } from '../types/vector';

async function main() {
  try {
    // 创建客户端实例
    const client = new LumosDBClient('http://127.0.0.1:8080');
    console.log('LumosDB 客户端已初始化');

    // 测试数据库查询操作
    console.log('\n===== 数据库查询操作 =====');
    try {
      const tables = await client.db.getTables();
      console.log('数据库表列表:', tables);
      
      // 查询一个表的数据
      if (tables.length > 0) {
        const firstTable = tables[0];
        console.log(`\n查询表 ${firstTable} 的数据:`);
        const result = await client.db.query(`SELECT * FROM ${firstTable} LIMIT 3`);
        console.log('列:', result.columns);
        console.log('行数:', result.count);
        console.log('数据:');
        result.rows.forEach(row => {
          console.log(row);
        });
      }
    } catch (error) {
      console.error('数据库查询失败:', error);
    }

    // 测试向量集合查询
    console.log('\n===== 向量集合查询 =====');
    try {
      const collections = await client.vector.getCollections();
      console.log('向量集合列表:', collections);
      
      // 如果有集合，测试集合详情获取
      if (collections.length > 0) {
        const firstCollection = collections[0];
        console.log(`\n获取集合 ${firstCollection.name} 的详情:`);
        try {
          const collectionDetails = await client.vector.getCollection(firstCollection.name);
          console.log('集合详情:', collectionDetails);
        } catch (error) {
          console.error('获取集合详情失败:', error);
        }
      }
    } catch (error) {
      console.error('获取向量集合失败:', error);
    }
    
    console.log('\n===== 测试总结 =====');
    console.log('测试完成！');
    
  } catch (error) {
    console.error('发生错误:', error);
  }
}

main(); 