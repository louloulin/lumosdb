'use client';

import { useEffect } from 'react';
import { initializeSDK } from '@/lib/api/sdk-client';

/**
 * SDK初始化组件
 * 用于在客户端首次渲染时初始化SDK
 */
export function SDKInitializer() {
  useEffect(() => {
    // 初始化SDK客户端
    initializeSDK();
    
    // 可以在此处添加SDK初始化后的其他逻辑
    console.log('LumosDB SDK 已初始化');
  }, []);
  
  // 此组件不渲染任何UI元素
  return null;
} 