import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLoadingApi } from '../use-loading-api';
import { LoadingProvider } from '@/contexts/loading-context';
import { toast } from 'sonner';

// Mock the toast library
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// 创建一个模拟API函数
const mockSuccessApi = jest.fn().mockImplementation(() => {
  return Promise.resolve({ id: 1, name: 'Test Item' });
});

const mockErrorApi = jest.fn().mockImplementation(() => {
  return Promise.reject(new Error('API Error'));
});

// 创建测试组件
const TestComponent = ({ 
  api = mockSuccessApi, 
  options = { module: 'test' } 
}) => {
  const { execute, data, error, isLoading, reset } = useLoadingApi(api, options);
  
  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="data">{data ? JSON.stringify(data) : 'no data'}</div>
      <div data-testid="error">{error ? error.message : 'no error'}</div>
      
      <button data-testid="execute" onClick={() => execute('test-arg')}>
        Execute
      </button>
      
      <button data-testid="reset" onClick={reset}>
        Reset
      </button>
    </div>
  );
};

// 包装组件，提供加载状态上下文
const WithProvider = (props: any) => (
  <LoadingProvider>
    <TestComponent {...props} />
  </LoadingProvider>
);

describe('useLoadingApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('初始状态应该为未加载且无数据', () => {
    render(<WithProvider />);
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    expect(screen.getByTestId('data')).toHaveTextContent('no data');
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
  });
  
  it('执行成功的API请求应该正确更新状态', async () => {
    render(<WithProvider />);
    
    const executeButton = screen.getByTestId('execute');
    await userEvent.click(executeButton);
    
    // 加载中状态
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    
    // 等待API请求完成
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    });
    
    // 验证数据已加载
    expect(screen.getByTestId('data')).toHaveTextContent('{"id":1,"name":"Test Item"}');
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
    
    // 验证API被调用
    expect(mockSuccessApi).toHaveBeenCalledWith('test-arg');
  });
  
  it('执行失败的API请求应该正确处理错误', async () => {
    render(<WithProvider api={mockErrorApi} />);
    
    const executeButton = screen.getByTestId('execute');
    await userEvent.click(executeButton);
    
    // 等待API请求完成
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    });
    
    // 验证错误状态
    expect(screen.getByTestId('data')).toHaveTextContent('no data');
    expect(screen.getByTestId('error')).toHaveTextContent('API Error');
    
    // 验证错误提示被调用
    expect(toast.error).toHaveBeenCalled();
  });
  
  it('成功时带有成功消息的API请求应显示成功提示', async () => {
    render(
      <WithProvider 
        options={{ 
          module: 'test', 
          successMessage: 'Success!', 
          showSuccessToast: true 
        }} 
      />
    );
    
    const executeButton = screen.getByTestId('execute');
    await userEvent.click(executeButton);
    
    // 等待API请求完成
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    });
    
    // 验证成功提示被调用
    expect(toast.success).toHaveBeenCalledWith('Success!');
  });
  
  it('不显示错误提示选项应阻止错误提示显示', async () => {
    render(
      <WithProvider 
        api={mockErrorApi} 
        options={{ 
          module: 'test', 
          showErrorToast: false 
        }} 
      />
    );
    
    const executeButton = screen.getByTestId('execute');
    await userEvent.click(executeButton);
    
    // 等待API请求完成
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    });
    
    // 验证错误提示未被调用
    expect(toast.error).not.toHaveBeenCalled();
  });
  
  it('重置函数应该清除数据和错误状态', async () => {
    render(<WithProvider />);
    
    // 执行API请求
    const executeButton = screen.getByTestId('execute');
    await userEvent.click(executeButton);
    
    // 等待API请求完成
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('{"id":1,"name":"Test Item"}');
    });
    
    // 重置状态
    const resetButton = screen.getByTestId('reset');
    await userEvent.click(resetButton);
    
    // 验证状态被重置
    expect(screen.getByTestId('data')).toHaveTextContent('no data');
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
  });
}); 