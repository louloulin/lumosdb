import { User, ApiKey } from '@sdk';
import * as authService from '../auth-service';
import * as sdkClient from '../sdk-client';

// 模拟localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// 模拟SDK客户端
jest.mock('../sdk-client', () => ({
  getClient: jest.fn()
}));

describe('Auth Service', () => {
  // 模拟用户数据
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'developer',
    createdAt: '2024-01-01',
    lastLogin: '2024-04-01'
  };
  
  // 模拟API密钥
  const mockApiKey: ApiKey = {
    id: '1',
    name: 'Test API Key',
    prefix: 'lmdb_test_',
    createdAt: '2024-01-01',
    createdBy: '1',
    permissions: ['read', 'write']
  };
  
  // 模拟SDK客户端
  const mockSDK = {
    auth: {
      login: jest.fn(),
      register: jest.fn(),
      getCurrentUser: jest.fn(),
      getApiKeys: jest.fn(),
      createApiKey: jest.fn(),
      deleteApiKey: jest.fn()
    },
    setApiKey: jest.fn()
  };
  
  beforeEach(() => {
    // 清除所有模拟函数的调用
    jest.clearAllMocks();
    // 清除localStorage
    localStorageMock.clear();
    // 配置模拟SDK客户端
    (sdkClient.getClient as jest.Mock).mockReturnValue(mockSDK);
  });
  
  describe('login', () => {
    it('should successfully login and store auth data', async () => {
      // 配置模拟响应
      mockSDK.auth.login.mockResolvedValue({
        user: mockUser,
        token: 'test_token'
      });
      
      // 调用登录函数
      const result = await authService.login('test@example.com', 'password');
      
      // 验证结果
      expect(result).toEqual({
        user: mockUser,
        token: 'test_token'
      });
      
      // 验证SDK客户端方法调用
      expect(mockSDK.auth.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(mockSDK.setApiKey).toHaveBeenCalledWith('test_token');
      
      // 验证本地存储
      expect(localStorageMock.getItem('lumos_auth_token')).toBe('test_token');
      expect(localStorageMock.getItem('lumos_auth_user')).toBe(JSON.stringify(mockUser));
    });
    
    it('should handle login errors', async () => {
      // 配置模拟错误
      mockSDK.auth.login.mockRejectedValue({ 
        success: false, 
        error: { code: 'AUTH_FAILED', message: 'Invalid credentials' } 
      });
      
      // 调用登录函数
      const result = await authService.login('wrong@example.com', 'wrong');
      
      // 验证结果包含错误信息
      expect(result.error).toBeDefined();
      expect(result.user).toEqual({} as User);
      expect(result.token).toBe('');
      
      // 验证本地存储没有被设置
      expect(localStorageMock.getItem('lumos_auth_token')).toBeNull();
      expect(localStorageMock.getItem('lumos_auth_user')).toBeNull();
    });
  });
  
  describe('register', () => {
    it('should successfully register a new user', async () => {
      // 配置模拟响应
      mockSDK.auth.register.mockResolvedValue({
        user: mockUser,
        token: 'test_token'
      });
      
      // 调用注册函数
      const result = await authService.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User'
      });
      
      // 验证结果
      expect(result).toEqual({
        user: mockUser,
        token: 'test_token'
      });
      
      // 验证SDK客户端方法调用
      expect(mockSDK.auth.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User'
      });
      
      // 验证本地存储
      expect(localStorageMock.getItem('lumos_auth_token')).toBe('test_token');
      expect(localStorageMock.getItem('lumos_auth_user')).toBe(JSON.stringify(mockUser));
    });
    
    it('should handle registration errors', async () => {
      // 配置模拟错误
      mockSDK.auth.register.mockRejectedValue({ 
        success: false, 
        error: { code: 'EMAIL_EXISTS', message: 'Email already in use' } 
      });
      
      // 调用注册函数
      const result = await authService.register({
        email: 'existing@example.com',
        password: 'password',
        name: 'Test User'
      });
      
      // 验证结果包含错误信息
      expect(result.error).toBeDefined();
      expect(result.user).toEqual({} as User);
      expect(result.token).toBe('');
    });
  });
  
  describe('getCurrentUser', () => {
    it('should return user from localStorage if available', async () => {
      // 设置localStorage中的用户
      localStorageMock.setItem('lumos_auth_user', JSON.stringify(mockUser));
      localStorageMock.setItem('lumos_auth_token', 'test_token');
      
      // 调用获取当前用户函数
      const result = await authService.getCurrentUser();
      
      // 验证结果
      expect(result).toEqual({ user: mockUser });
      
      // 验证SDK客户端方法没有被调用
      expect(mockSDK.auth.getCurrentUser).not.toHaveBeenCalled();
    });
    
    it('should fetch user from server if not in localStorage', async () => {
      // 配置模拟响应
      mockSDK.auth.getCurrentUser.mockResolvedValue(mockUser);
      
      // 调用获取当前用户函数
      const result = await authService.getCurrentUser();
      
      // 验证结果
      expect(result).toEqual({ user: mockUser });
      
      // 验证SDK客户端方法被调用
      expect(mockSDK.auth.getCurrentUser).toHaveBeenCalled();
      
      // 验证本地存储被更新
      expect(localStorageMock.getItem('lumos_auth_user')).toBe(JSON.stringify(mockUser));
    });
    
    it('should handle errors when fetching user', async () => {
      // 配置模拟错误
      mockSDK.auth.getCurrentUser.mockRejectedValue({ 
        success: false, 
        error: { code: 'AUTH_FAILED', message: 'Authentication failed' } 
      });
      
      // 调用获取当前用户函数
      const result = await authService.getCurrentUser();
      
      // 验证结果包含错误信息
      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
    });
  });
  
  describe('logout', () => {
    it('should clear auth data from localStorage', () => {
      // 设置localStorage
      localStorageMock.setItem('lumos_auth_token', 'test_token');
      localStorageMock.setItem('lumos_auth_user', JSON.stringify(mockUser));
      
      // 调用退出登录函数
      authService.logout();
      
      // 验证localStorage被清除
      expect(localStorageMock.getItem('lumos_auth_token')).toBeNull();
      expect(localStorageMock.getItem('lumos_auth_user')).toBeNull();
      
      // 验证SDK客户端的API密钥被重置
      expect(mockSDK.setApiKey).toHaveBeenCalledWith('');
    });
  });
  
  describe('API Key Management', () => {
    it('should retrieve API keys', async () => {
      // 配置模拟响应
      mockSDK.auth.getApiKeys.mockResolvedValue([mockApiKey]);
      
      // 调用获取API密钥函数
      const result = await authService.getApiKeys();
      
      // 验证结果
      expect(result).toEqual({ keys: [mockApiKey] });
      
      // 验证SDK客户端方法被调用
      expect(mockSDK.auth.getApiKeys).toHaveBeenCalled();
    });
    
    it('should create a new API key', async () => {
      // 配置模拟响应
      mockSDK.auth.createApiKey.mockResolvedValue(mockApiKey);
      
      // 调用创建API密钥函数
      const result = await authService.createApiKey({
        name: 'Test API Key',
        permissions: ['read', 'write']
      });
      
      // 验证结果
      expect(result).toEqual({ key: mockApiKey });
      
      // 验证SDK客户端方法被调用
      expect(mockSDK.auth.createApiKey).toHaveBeenCalledWith({
        name: 'Test API Key',
        permissions: ['read', 'write']
      });
    });
    
    it('should delete an API key', async () => {
      // 配置模拟响应
      mockSDK.auth.deleteApiKey.mockResolvedValue(undefined);
      
      // 调用删除API密钥函数
      const result = await authService.deleteApiKey('1');
      
      // 验证结果
      expect(result).toEqual({ success: true });
      
      // 验证SDK客户端方法被调用
      expect(mockSDK.auth.deleteApiKey).toHaveBeenCalledWith('1');
    });
  });
  
  describe('Helper Methods', () => {
    it('should check if user is logged in', () => {
      // 未登录状态
      expect(authService.isLoggedIn()).toBe(false);
      
      // 设置登录状态
      localStorageMock.setItem('lumos_auth_token', 'test_token');
      expect(authService.isLoggedIn()).toBe(true);
    });
    
    it('should get auth token', () => {
      // 未设置token
      expect(authService.getAuthToken()).toBeNull();
      
      // 设置token
      localStorageMock.setItem('lumos_auth_token', 'test_token');
      expect(authService.getAuthToken()).toBe('test_token');
    });
  });
}); 