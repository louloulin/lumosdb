import { useState, useCallback } from 'react';

type ApiFunction<T, A extends unknown[]> = (...args: A) => Promise<T>;

interface UseLoadingApiResult<T, A extends unknown[]> {
  execute: (...args: A) => Promise<T>;
  loading: boolean;
  error: Error | null;
  clearError: () => void;
}

/**
 * 用于管理API调用的加载状态、执行和错误处理的Hook
 * 
 * @param fn API调用函数
 * @returns 包含执行函数、加载状态和错误信息的对象
 * 
 * @example
 * const { execute: fetchUsers, loading, error } = useLoadingApi(api.getUsers);
 * 
 * useEffect(() => {
 *   fetchUsers();
 * }, []);
 */
export function useLoadingApi<T, A extends unknown[]>(
  fn: ApiFunction<T, A>
): UseLoadingApiResult<T, A> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: A): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const result = await fn(...args);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { execute, loading, error, clearError };
} 