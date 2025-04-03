import { handleError, createApiError, ErrorType, getUserFriendlyErrorMessage } from '../error-handler';

describe('错误处理机制', () => {
  describe('createApiError', () => {
    it('应创建API错误对象', () => {
      const error = createApiError(
        ErrorType.VALIDATION,
        '验证失败',
        { field: 'username' },
        new Error('原始错误')
      );
      
      expect(error).toEqual({
        type: ErrorType.VALIDATION,
        message: '验证失败',
        details: { field: 'username' },
        originalError: new Error('原始错误')
      });
    });
    
    it('应创建没有详细信息的API错误', () => {
      const error = createApiError(ErrorType.AUTH, '认证失败');
      
      expect(error).toEqual({
        type: ErrorType.AUTH,
        message: '认证失败',
        details: undefined,
        originalError: undefined
      });
    });
  });
  
  describe('handleError', () => {
    it('应处理网络错误', () => {
      const networkError = new TypeError('Failed to fetch');
      const result = handleError(networkError);
      
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.message).toBe('网络连接错误，请检查您的网络连接');
      expect(result.originalError).toBe(networkError);
    });
    
    it('应处理HTTP 401错误', () => {
      const httpError = {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Invalid token' }
      };
      
      const result = handleError(httpError);
      
      expect(result.type).toBe(ErrorType.AUTH);
      expect(result.message).toBe('认证失败，请重新登录');
      expect(result.details).toEqual({ message: 'Invalid token' });
      expect(result.originalError).toBe(httpError);
    });
    
    it('应处理HTTP 403错误', () => {
      const httpError = {
        status: 403,
        statusText: 'Forbidden',
        data: { message: 'Access denied' }
      };
      
      const result = handleError(httpError);
      
      expect(result.type).toBe(ErrorType.PERMISSION);
      expect(result.message).toBe('您没有权限执行此操作');
      expect(result.details).toEqual({ message: 'Access denied' });
      expect(result.originalError).toBe(httpError);
    });
    
    it('应处理HTTP 404错误', () => {
      const httpError = {
        status: 404,
        statusText: 'Not Found',
        data: { message: 'Resource not found' }
      };
      
      const result = handleError(httpError);
      
      expect(result.type).toBe(ErrorType.NOT_FOUND);
      expect(result.message).toBe('请求的资源不存在');
      expect(result.details).toEqual({ message: 'Resource not found' });
      expect(result.originalError).toBe(httpError);
    });
    
    it('应处理HTTP 400错误', () => {
      const httpError = {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Invalid input' }
      };
      
      const result = handleError(httpError);
      
      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.message).toBe('请求参数验证失败');
      expect(result.details).toEqual({ message: 'Invalid input' });
      expect(result.originalError).toBe(httpError);
    });
    
    it('应处理HTTP 500错误', () => {
      const httpError = {
        status: 500,
        statusText: 'Internal Server Error',
        data: { message: 'Server crashed' }
      };
      
      const result = handleError(httpError);
      
      expect(result.type).toBe(ErrorType.SERVER);
      expect(result.message).toBe('服务器错误，请稍后重试');
      expect(result.details).toEqual({ message: 'Server crashed' });
      expect(result.originalError).toBe(httpError);
    });
    
    it('应处理其他HTTP错误', () => {
      const httpError = {
        status: 429,
        statusText: 'Too Many Requests',
        data: { message: 'Rate limited' }
      };
      
      const result = handleError(httpError);
      
      expect(result.type).toBe(ErrorType.CLIENT);
      expect(result.message).toBe('请求错误: 429 Too Many Requests');
      expect(result.details).toEqual({ message: 'Rate limited' });
      expect(result.originalError).toBe(httpError);
    });
    
    it('应处理一般错误对象', () => {
      const error = new Error('Something went wrong');
      const result = handleError(error);
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Something went wrong');
      expect(result.originalError).toBe(error);
    });
    
    it('应处理字符串错误', () => {
      const result = handleError('Something went wrong');
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Something went wrong');
      expect(result.originalError).toBe('Something went wrong');
    });
    
    it('应处理未知类型错误', () => {
      const result = handleError(null);
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('发生未知错误');
      expect(result.originalError).toBe(null);
    });
    
    it('应原样返回已经是ApiError的对象', () => {
      const apiError = {
        type: ErrorType.VALIDATION,
        message: '验证失败',
        details: { field: 'email' },
        originalError: new Error('原始错误')
      };
      
      const result = handleError(apiError);
      
      expect(result).toBe(apiError);
    });
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    it('应返回网络错误的友好消息', () => {
      const error = createApiError(ErrorType.NETWORK, '网络错误');
      const message = getUserFriendlyErrorMessage(error);
      
      expect(message).toBe('网络连接错误，请检查您的网络连接并重试。');
    });
    
    it('应返回认证错误的友好消息', () => {
      const error = createApiError(ErrorType.AUTH, '认证失败');
      const message = getUserFriendlyErrorMessage(error);
      
      expect(message).toBe('认证失败，请重新登录后再试。');
    });
    
    it('应返回权限错误的友好消息', () => {
      const error = createApiError(ErrorType.PERMISSION, '没有权限');
      const message = getUserFriendlyErrorMessage(error);
      
      expect(message).toBe('您没有权限执行此操作。');
    });
    
    it('应返回验证错误的友好消息', () => {
      const error = createApiError(ErrorType.VALIDATION, '验证错误');
      const message = getUserFriendlyErrorMessage(error);
      
      expect(message).toBe('输入数据验证失败，请检查您的输入并重试。');
    });
    
    it('应返回未找到资源的友好消息', () => {
      const error = createApiError(ErrorType.NOT_FOUND, '资源不存在');
      const message = getUserFriendlyErrorMessage(error);
      
      expect(message).toBe('请求的资源不存在。');
    });
    
    it('应返回服务器错误的友好消息', () => {
      const error = createApiError(ErrorType.SERVER, '服务器错误');
      const message = getUserFriendlyErrorMessage(error);
      
      expect(message).toBe('服务器发生错误，请稍后重试。');
    });
    
    it('应返回客户端错误的友好消息', () => {
      const error = createApiError(ErrorType.CLIENT, '客户端错误');
      const message = getUserFriendlyErrorMessage(error);
      
      expect(message).toBe('客户端请求错误，请重试。');
    });
    
    it('应返回未知错误的友好消息', () => {
      const error = createApiError(ErrorType.UNKNOWN, '未知错误');
      const message = getUserFriendlyErrorMessage(error);
      
      expect(message).toBe('发生错误: 未知错误');
    });
  });
}); 