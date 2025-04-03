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