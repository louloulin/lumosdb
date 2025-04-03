import { useState, useEffect, useCallback } from "react";
import { useLoading } from "@/contexts/loading-context";
import { toast } from "sonner";

interface UseLoadingApiOptions<T> {
  // 模块名称，用于加载状态管理
  module: string;
  // 加载成功消息 (可选)
  successMessage?: string;
  // 默认错误消息
  defaultErrorMessage?: string;
  // 是否显示错误提示
  showErrorToast?: boolean;
  // 是否显示成功提示
  showSuccessToast?: boolean;
  // 完成时的回调函数
  onComplete?: (result: T | null, error: Error | null) => void;
  // 失败时的回调函数
  onError?: (error: Error) => void;
  // 成功时的回调函数
  onSuccess?: (result: T) => void;
  // 初始数据
  initialData?: T;
}

/**
 * 包装API请求的钩子，自动处理加载状态、错误处理和通知
 */
export function useLoadingApi<T, P extends unknown[] = unknown[]>(
  apiFunction: (...args: P) => Promise<T>,
  options: UseLoadingApiOptions<T>
) {
  const { module, successMessage, defaultErrorMessage = "操作失败", showErrorToast = true, 
         showSuccessToast = false, onComplete, onError, onSuccess, initialData } = options;
  
  const [data, setData] = useState<T | null>(initialData || null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { setModuleLoading } = useLoading();
  
  // 包装API请求函数，添加加载状态管理
  const execute = useCallback(
    async (...args: P) => {
      try {
        setIsLoading(true);
        setModuleLoading(module, true);
        setError(null);
        
        const result = await apiFunction(...args);
        
        setData(result);
        
        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }
        
        onSuccess?.(result);
        onComplete?.(result, null);
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        setError(error);
        
        if (showErrorToast) {
          toast.error(
            error.message || defaultErrorMessage
          );
        }
        
        onError?.(error);
        onComplete?.(null, error);
        
        throw error;
      } finally {
        setIsLoading(false);
        setModuleLoading(module, false);
      }
    },
    [apiFunction, module, setModuleLoading, successMessage, defaultErrorMessage, 
     showErrorToast, showSuccessToast, onComplete, onError, onSuccess]
  );
  
  // 自动重置错误状态
  useEffect(() => {
    return () => {
      setModuleLoading(module, false);
    };
  }, [module, setModuleLoading]);
  
  return {
    execute,
    data,
    error,
    isLoading,
    reset: useCallback(() => {
      setData(initialData || null);
      setError(null);
    }, [initialData]),
  };
}

/**
 * 用于管理表单提交的加载状态
 */
export function useLoadingForm<T, D>(
  submitFunction: (data: D) => Promise<T>,
  options: Omit<UseLoadingApiOptions<T>, "module"> & { formId: string }
) {
  const moduleId = `form:${options.formId}`;
  return useLoadingApi(submitFunction, { ...options, module: moduleId });
}

// 简化版的CRUD加载状态钩子
export function createCrudHooks<T, ID = string>(modulePrefix: string) {
  return {
    useGetAll: (getAllFn?: () => Promise<T[]>, options: Partial<UseLoadingApiOptions<T[]>> = {}) => {
      // 如果函数不存在，返回空值
      if (!getAllFn) {
        return { execute: null, data: null, error: null, isLoading: false, reset: () => {} };
      }
      
      return useLoadingApi(getAllFn, {
        module: `${modulePrefix}:getAll`,
        defaultErrorMessage: "获取数据失败",
        ...options,
      });
    },
    
    useGetById: (getByIdFn?: (id: ID) => Promise<T>, options: Partial<UseLoadingApiOptions<T>> = {}) => {
      if (!getByIdFn) {
        return { execute: null, data: null, error: null, isLoading: false, reset: () => {} };
      }
      
      return useLoadingApi(getByIdFn, {
        module: `${modulePrefix}:getById`,
        defaultErrorMessage: "获取详情失败",
        ...options,
      });
    },
    
    useCreate: (createFn?: (data: Partial<T>) => Promise<T>, options: Partial<UseLoadingApiOptions<T>> = {}) => {
      if (!createFn) {
        return { execute: null, data: null, error: null, isLoading: false, reset: () => {} };
      }
      
      return useLoadingApi(createFn, {
        module: `${modulePrefix}:create`,
        successMessage: "创建成功",
        defaultErrorMessage: "创建失败",
        showSuccessToast: true,
        ...options,
      });
    },
    
    useUpdate: (updateFn?: (id: ID, data: Partial<T>) => Promise<T>, options: Partial<UseLoadingApiOptions<T>> = {}) => {
      if (!updateFn) {
        return { execute: null, data: null, error: null, isLoading: false, reset: () => {} };
      }
      
      return useLoadingApi(updateFn, {
        module: `${modulePrefix}:update`,
        successMessage: "更新成功",
        defaultErrorMessage: "更新失败",
        showSuccessToast: true,
        ...options,
      });
    },
    
    useDelete: (deleteFn?: (id: ID) => Promise<void>, options: Partial<UseLoadingApiOptions<void>> = {}) => {
      if (!deleteFn) {
        return { execute: null, data: null, error: null, isLoading: false, reset: () => {} };
      }
      
      return useLoadingApi(deleteFn, {
        module: `${modulePrefix}:delete`,
        successMessage: "删除成功",
        defaultErrorMessage: "删除失败",
        showSuccessToast: true,
        ...options,
      });
    },
  };
} 