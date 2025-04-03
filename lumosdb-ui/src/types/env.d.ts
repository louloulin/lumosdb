/**
 * 环境变量类型声明
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // 运行环境
    NODE_ENV: 'development' | 'production' | 'test';
    
    // API配置
    NEXT_PUBLIC_API_URL: string;
    
    // 认证相关
    NEXT_PUBLIC_AUTH_ENABLED?: string;
    
    // 开发配置
    NEXT_PUBLIC_MOCK_API?: string;
    NEXT_PUBLIC_DEBUG?: string;
  }
} 