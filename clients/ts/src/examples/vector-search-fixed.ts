import { LumosDBClient } from '../index';

async function main() {
  try {
    console.log('===== LumosDB 向量搜索修复示例 =====');
    
    // 初始化客户端
    const client = new LumosDBClient('http://127.0.0.1:8080');
    console.log('客户端初始化成功');
    
    // 获取所有向量集合
    console.log('\n>> 获取所有向量集合');
    const collections = await client.vector.getCollections();
    console.log('向量集合列表:', collections);
    
    if (collections.length === 0) {
      console.log('\n>> 没有找到向量集合，创建一个新的测试集合');
      const testCollectionName = 'test_vectors_fixed';
      const dimension = 4;
      
      try {
        await client.vector.createCollection(testCollectionName, dimension);
        console.log(`集合 ${testCollectionName} 创建成功`);
        
        // 添加测试向量
        console.log('\n>> 添加测试向量');
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
        console.log('向量添加成功');
        
        // 执行向量搜索 - 使用修复后的格式
        console.log('\n>> 执行向量搜索 (修复后)');
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
          console.log('错误详情:', JSON.stringify(error, null, 2));
        }
        
        // 清理 - 删除测试集合
        console.log('\n>> 清理 - 删除测试集合');
        await client.vector.deleteCollection(testCollectionName);
        console.log(`集合 ${testCollectionName} 删除成功`);
      } catch (error) {
        console.error('集合操作失败:', error);
      }
    } else {
      // 使用现有的第一个集合
      const collection = collections[0];
      console.log(`\n>> 使用现有集合: ${collection.name}`);
      
      // 添加测试向量
      console.log('\n>> 添加测试向量');
      const id = `test_${Date.now()}`;
      const embedding = new Array(collection.dimension).fill(0).map(() => Math.random());
      const metadata = { source: 'vector_search_fixed_test' };
      
      try {
        // 使用addEmbeddings添加单个向量
        await client.vector.addEmbeddings(
          collection.name, 
          [id], 
          [embedding], 
          [metadata]
        );
        console.log('向量添加成功');
        
        // 执行向量搜索 - 使用修复后的格式
        console.log('\n>> 执行向量搜索 (修复后)');
        try {
          const searchResults = await client.vector.search(
            collection.name,
            embedding, // 使用刚添加的向量作为查询向量
            5 // 返回前5个结果
          );
          console.log('搜索结果:', searchResults);
          console.log('✓ 向量搜索成功');
        } catch (error) {
          console.error('✗ 向量搜索失败:', error);
          console.log('错误详情:', JSON.stringify(error, null, 2));
        }
      } catch (error) {
        console.error('向量操作失败:', error);
      }
    }
    
    console.log('\n===== 测试完成 =====');
    
  } catch (error) {
    console.error('发生错误:', error);
  }
}

main(); 