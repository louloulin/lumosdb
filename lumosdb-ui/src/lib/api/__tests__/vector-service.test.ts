import { 
  searchByText, 
  getVectorCollections, 
  getCollectionStats,
  createVectorCollection,
  deleteVectorCollection 
} from '../vector-service';
import { getVectorClient } from '../sdk-client';

// 模拟SDK客户端
jest.mock('../sdk-client', () => ({
  getVectorClient: jest.fn()
}));

describe('向量服务', () => {
  const mockVectorClient = {
    listCollections: jest.fn(),
    createCollection: jest.fn(),
    deleteCollection: jest.fn(),
    addVectors: jest.fn(),
    getVectors: jest.fn(),
    search: jest.fn(),
    searchByText: jest.fn(),
    getCollectionStats: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (getVectorClient as jest.Mock).mockReturnValue(mockVectorClient);
  });
  
  describe('searchByText', () => {
    it('应成功执行文本相似度搜索', async () => {
      // 准备
      const collectionName = 'test_collection';
      const searchParams = {
        text: '测试查询',
        limit: 5,
        filter: { category: 'test' }
      };
      
      const mockSearchResults = [
        {
          id: '1',
          score: 0.95,
          metadata: { title: '测试文档1', category: 'test' }
        },
        {
          id: '2',
          score: 0.85,
          metadata: { title: '测试文档2', category: 'test' }
        }
      ];
      
      mockVectorClient.searchByText.mockResolvedValue(mockSearchResults);
      
      // 执行
      const result = await searchByText(collectionName, searchParams);
      
      // 断言
      expect(mockVectorClient.searchByText).toHaveBeenCalledWith(
        collectionName,
        searchParams
      );
      expect(result.results).toEqual(mockSearchResults);
      expect(result.error).toBeNull();
    });
    
    it('应处理搜索错误', async () => {
      // 准备
      const collectionName = 'test_collection';
      const searchParams = {
        text: '测试查询'
      };
      const mockError = new Error('搜索失败');
      
      mockVectorClient.searchByText.mockRejectedValue(mockError);
      
      // 执行
      const result = await searchByText(collectionName, searchParams);
      
      // 断言
      expect(mockVectorClient.searchByText).toHaveBeenCalledWith(
        collectionName,
        searchParams
      );
      expect(result.results).toEqual([]);
      expect(result.error).toBe(mockError.message);
    });
  });
  
  describe('getCollectionStats', () => {
    it('应返回集合统计信息', async () => {
      // 准备
      const collectionName = 'test_collection';
      const mockStats = {
        vectorCount: 100,
        dimension: 1536,
        indexType: 'hnsw',
        createdAt: '2023-01-01T00:00:00Z',
        metadataFields: ['title', 'category']
      };
      
      mockVectorClient.getCollectionStats.mockResolvedValue(mockStats);
      
      // 执行
      const result = await getCollectionStats(collectionName);
      
      // 断言
      expect(mockVectorClient.getCollectionStats).toHaveBeenCalledWith(collectionName);
      expect(result.stats).toEqual(mockStats);
      expect(result.error).toBeNull();
    });
    
    it('应处理获取统计信息错误', async () => {
      // 准备
      const collectionName = 'test_collection';
      const mockError = new Error('获取统计信息失败');
      
      mockVectorClient.getCollectionStats.mockRejectedValue(mockError);
      
      // 执行
      const result = await getCollectionStats(collectionName);
      
      // 断言
      expect(mockVectorClient.getCollectionStats).toHaveBeenCalledWith(collectionName);
      expect(result.stats).toBeNull();
      expect(result.error).toBe(mockError.message);
    });
  });
  
  describe('createVectorCollection', () => {
    it('应成功创建向量集合', async () => {
      // 准备
      const name = 'test_collection';
      const dimension = 1536;
      const distance = 'cosine';
      
      mockVectorClient.createCollection.mockResolvedValue(undefined);
      
      // 执行
      const result = await createVectorCollection(name, dimension, distance);
      
      // 断言
      expect(mockVectorClient.createCollection).toHaveBeenCalledWith({
        name,
        dimension,
        distanceFunction: distance
      });
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });
}); 