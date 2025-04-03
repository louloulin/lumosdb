/**
 * @deprecated 此文件已废弃，请使用auth-service.ts代替
 * 这个文件仅仅用于类型兼容，所有的实现逻辑已移至auth-service.ts
 */

// 从SDK中重新导出用户类型定义，保持向后兼容
export type { User, ApiKey } from '@sdk';

// 为了向后兼容，提供空函数实现，它们会引导用户使用新的auth-service
export function login(email: string, password: string): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function register(data: { email: string; password: string; name: string }): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function getCurrentUser(): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function logout(): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function getAllUsers(): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function updateUserRole(userId: string, role: string): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function deleteUser(userId: string): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function getApiKeys(): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function createApiKey(data: { name: string; permissions: string[] }): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
}

export function deleteApiKey(keyId: string): Promise<never> {
  console.warn('auth.ts已废弃，请使用auth-service.ts代替');
  throw new Error('auth.ts已废弃，请使用auth-service.ts代替');
} 