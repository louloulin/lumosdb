// API配置
export const ApiConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
};

// Export a default API URL for convenience
export const API_BASE_URL = ApiConfig.apiBaseUrl; 