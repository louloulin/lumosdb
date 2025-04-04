// Jest setup file
global.console = {
  ...console,
  // 避免测试输出过多日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 设置测试环境
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3008';

// Add Jest setup code here
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn()
  })),
  usePathname: jest.fn().mockReturnValue('/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
})); 