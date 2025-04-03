"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// 加载状态类型
interface LoadingState {
  // 全局加载状态
  global: boolean;
  // 各模块加载状态
  modules: Record<string, boolean>;
}

// 加载上下文类型
interface LoadingContextType {
  // 当前加载状态
  loading: LoadingState;
  // 设置全局加载状态
  setGlobalLoading: (isLoading: boolean) => void;
  // 设置模块加载状态
  setModuleLoading: (moduleName: string, isLoading: boolean) => void;
  // 判断模块是否正在加载
  isModuleLoading: (moduleName: string) => boolean;
  // 判断是否有任何加载
  isAnyLoading: () => boolean;
}

// 创建加载上下文
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// 加载状态提供者组件
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  // 加载状态
  const [loading, setLoading] = useState<LoadingState>({
    global: false,
    modules: {},
  });

  // 设置全局加载状态
  const setGlobalLoading = useCallback((isLoading: boolean) => {
    setLoading((prev) => ({
      ...prev,
      global: isLoading,
    }));
  }, []);

  // 设置模块加载状态
  const setModuleLoading = useCallback((moduleName: string, isLoading: boolean) => {
    setLoading((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleName]: isLoading,
      },
    }));
  }, []);

  // 判断模块是否正在加载
  const isModuleLoading = useCallback(
    (moduleName: string) => !!loading.modules[moduleName],
    [loading.modules]
  );

  // 判断是否有任何加载
  const isAnyLoading = useCallback(() => {
    return (
      loading.global ||
      Object.values(loading.modules).some((isLoading) => isLoading)
    );
  }, [loading]);

  return (
    <LoadingContext.Provider
      value={{
        loading,
        setGlobalLoading,
        setModuleLoading,
        isModuleLoading,
        isAnyLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

// 自定义钩子以在组件中使用加载上下文
export function useLoading() {
  const context = useContext(LoadingContext);

  if (context === undefined) {
    throw new Error("useLoading必须在LoadingProvider内部使用");
  }

  return context;
}

// 加载状态高阶组件
export function withLoading<P extends object>(
  Component: React.ComponentType<P>,
  moduleName: string
) {
  return function WithLoadingComponent(props: P) {
    const { setModuleLoading } = useLoading();

    // 组件挂载时设置加载状态
    React.useEffect(() => {
      return () => {
        // 组件卸载时清除加载状态
        setModuleLoading(moduleName, false);
      };
    }, [setModuleLoading]);

    return <Component {...props} />;
  };
} 