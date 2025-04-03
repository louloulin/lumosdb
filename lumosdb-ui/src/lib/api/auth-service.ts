import { User } from '@sdk';
import { sdkClient } from './sdk-client';
import { handleError } from './error-handler';

// 本地存储键
const TOKEN_KEY = 'lumos_auth_token';
const USER_KEY = 'lumos_auth_user';

/**
 * 登录
 * @param email 邮箱
 * @param password 密码
 * @returns 登录结果
 */
export async function login(email: string, password: string) {
  try {
    const client = sdkClient.getClient();
    const result = await client.auth.login(email, password);
    
    // 保存认证令牌和用户信息
    if (result && result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      
      return {
        success: true,
        user: result.user
      };
    }
    
    return {
      success: false,
      error: '登录失败，请检查您的邮箱和密码',
      user: null
    };
  } catch (error) {
    const apiError = handleError(error);
    console.error('登录失败:', apiError);
    
    return {
      success: false,
      error: apiError.message || '登录失败，请检查您的邮箱和密码',
      user: null
    };
  }
}

/**
 * 注册
 * @param data 注册数据
 * @returns 注册结果
 */
export async function register(data: { email: string; password: string; name: string }) {
  try {
    const client = sdkClient.getClient();
    const result = await client.auth.register(data);
    
    // 保存认证令牌和用户信息
    if (result && result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      
      return {
        success: true,
        user: result.user
      };
    }
    
    return {
      success: false,
      error: '注册失败，请检查您的输入',
      user: null
    };
  } catch (error) {
    const apiError = handleError(error);
    console.error('注册失败:', apiError);
    
    return {
      success: false,
      error: apiError.message || '注册失败，请检查您的输入',
      user: null
    };
  }
}

/**
 * 登出
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * 检查用户是否已登录
 * @returns 是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

/**
 * 获取认证令牌
 * @returns 认证令牌
 */
export function getAuthToken(): string | null {
  return localStorage?.getItem(TOKEN_KEY) || null;
}

/**
 * 获取当前用户
 * @returns 当前用户信息
 */
export async function getCurrentUser() {
  try {
    // 先尝试从本地存储获取
    const token = getAuthToken();
    const userJson = localStorage?.getItem(USER_KEY);
    
    if (token && userJson) {
      return {
        user: JSON.parse(userJson) as User
      };
    }
    
    // 如果本地没有，则从服务器获取
    const client = sdkClient.getClient();
    const user = await client.auth.getCurrentUser();
    
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user };
    }
    
    return {
      user: null,
      error: '未找到用户信息'
    };
  } catch (error) {
    const apiError = handleError(error);
    console.error('获取当前用户失败:', apiError);
    
    return {
      user: null,
      error: apiError.message || '获取用户信息失败'
    };
  }
}

/**
 * 获取所有API密钥
 * @returns API密钥列表
 */
export async function getApiKeys() {
  try {
    const client = sdkClient.getClient();
    const keys = await client.auth.getApiKeys();
    
    return {
      success: true,
      keys
    };
  } catch (error) {
    const apiError = handleError(error);
    console.error('获取API密钥失败:', apiError);
    
    return {
      success: false,
      error: apiError.message || '获取API密钥失败',
      keys: []
    };
  }
}

/**
 * 创建API密钥
 * @param data API密钥数据
 * @returns 创建结果
 */
export async function createApiKey(data: { name: string; permissions: Array<'read' | 'write' | 'delete'> }) {
  try {
    const client = sdkClient.getClient();
    const key = await client.auth.createApiKey(data);
    
    return {
      success: true,
      key
    };
  } catch (error) {
    const apiError = handleError(error);
    console.error('创建API密钥失败:', apiError);
    
    return {
      success: false,
      error: apiError.message || '创建API密钥失败'
    };
  }
}

/**
 * 删除API密钥
 * @param id API密钥ID
 * @returns 删除结果
 */
export async function deleteApiKey(id: string) {
  try {
    const client = sdkClient.getClient();
    await client.auth.deleteApiKey(id);
    
    return {
      success: true
    };
  } catch (error) {
    const apiError = handleError(error);
    console.error('删除API密钥失败:', apiError);
    
    return {
      success: false,
      error: apiError.message || '删除API密钥失败'
    };
  }
} 