import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingProvider, useLoading } from '../loading-context';

// 测试组件，用于显示加载状态
const TestComponent = () => {
  const { loading, setGlobalLoading, setModuleLoading, isModuleLoading, isAnyLoading } = useLoading();
  
  return (
    <div>
      <div data-testid="global-state">{loading.global ? 'loading' : 'idle'}</div>
      <div data-testid="any-loading">{isAnyLoading() ? 'true' : 'false'}</div>
      <div data-testid="module-test">{isModuleLoading('test') ? 'loading' : 'idle'}</div>
      <div data-testid="module-auth">{isModuleLoading('auth') ? 'loading' : 'idle'}</div>
      
      <button 
        data-testid="set-global-loading" 
        onClick={() => setGlobalLoading(true)}
      >
        Set Global Loading
      </button>
      
      <button 
        data-testid="clear-global-loading" 
        onClick={() => setGlobalLoading(false)}
      >
        Clear Global Loading
      </button>
      
      <button 
        data-testid="set-test-loading" 
        onClick={() => setModuleLoading('test', true)}
      >
        Set Test Module Loading
      </button>
      
      <button 
        data-testid="clear-test-loading" 
        onClick={() => setModuleLoading('test', false)}
      >
        Clear Test Module Loading
      </button>
      
      <button 
        data-testid="set-auth-loading" 
        onClick={() => setModuleLoading('auth', true)}
      >
        Set Auth Module Loading
      </button>
      
      <button 
        data-testid="clear-auth-loading" 
        onClick={() => setModuleLoading('auth', false)}
      >
        Clear Auth Module Loading
      </button>
    </div>
  );
};

// 包装组件，提供加载状态上下文
const WithProvider = () => (
  <LoadingProvider>
    <TestComponent />
  </LoadingProvider>
);

describe('LoadingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('初始状态应该为未加载', () => {
    render(<WithProvider />);
    
    expect(screen.getByTestId('global-state')).toHaveTextContent('idle');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('module-test')).toHaveTextContent('idle');
    expect(screen.getByTestId('module-auth')).toHaveTextContent('idle');
  });
  
  it('设置全局加载状态应该正确更新', async () => {
    const user = userEvent.setup();
    render(<WithProvider />);
    
    await user.click(screen.getByTestId('set-global-loading'));
    
    expect(screen.getByTestId('global-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('true');
    
    await user.click(screen.getByTestId('clear-global-loading'));
    
    expect(screen.getByTestId('global-state')).toHaveTextContent('idle');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('false');
  });
  
  it('设置模块加载状态应该正确更新', async () => {
    const user = userEvent.setup();
    render(<WithProvider />);
    
    await user.click(screen.getByTestId('set-test-loading'));
    
    expect(screen.getByTestId('module-test')).toHaveTextContent('loading');
    expect(screen.getByTestId('module-auth')).toHaveTextContent('idle');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('true');
    
    await user.click(screen.getByTestId('set-auth-loading'));
    
    expect(screen.getByTestId('module-test')).toHaveTextContent('loading');
    expect(screen.getByTestId('module-auth')).toHaveTextContent('loading');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('true');
    
    await user.click(screen.getByTestId('clear-test-loading'));
    
    expect(screen.getByTestId('module-test')).toHaveTextContent('idle');
    expect(screen.getByTestId('module-auth')).toHaveTextContent('loading');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('true');
    
    await user.click(screen.getByTestId('clear-auth-loading'));
    
    expect(screen.getByTestId('module-test')).toHaveTextContent('idle');
    expect(screen.getByTestId('module-auth')).toHaveTextContent('idle');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('false');
  });
  
  it('多个加载状态应该正确标记isAnyLoading', async () => {
    const user = userEvent.setup();
    render(<WithProvider />);
    
    // 设置全局和模块加载状态
    await user.click(screen.getByTestId('set-global-loading'));
    await user.click(screen.getByTestId('set-test-loading'));
    
    expect(screen.getByTestId('global-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('module-test')).toHaveTextContent('loading');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('true');
    
    // 清除全局加载状态，但模块仍在加载
    await user.click(screen.getByTestId('clear-global-loading'));
    
    expect(screen.getByTestId('global-state')).toHaveTextContent('idle');
    expect(screen.getByTestId('module-test')).toHaveTextContent('loading');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('true');
    
    // 清除所有加载状态
    await user.click(screen.getByTestId('clear-test-loading'));
    
    expect(screen.getByTestId('global-state')).toHaveTextContent('idle');
    expect(screen.getByTestId('module-test')).toHaveTextContent('idle');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('false');
  });
  
  it('在未提供上下文时，使用useLoading应该抛出错误', () => {
    // 模拟错误处理
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLoading必须在LoadingProvider内部使用');
    
    // 恢复console.error
    console.error = originalConsoleError;
  });
}); 