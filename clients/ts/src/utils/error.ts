import { ApiResponse, ApiError } from '../types/core';

/**
 * 如果响应包含错误则抛出错误
 * @param response API响应
 * @throws 如果响应包含错误
 */
export function throwIfError<T>(response: ApiResponse<T>): void {
  if (!response.success) {
    const error = response.error || { code: 'UNKNOWN_ERROR', message: 'Unknown error occurred' };
    
    // 根据错误类型提供更有用的错误消息
    let errorMessage = error.message;
    
    if (error.code === 'DATABASE_EXECUTE_ERROR' && error.message.includes('Execute returned results')) {
      errorMessage = '尝试使用execute执行SELECT查询。请使用query方法代替。';
    } else if (error.code === 'TABLE_NOT_FOUND') {
      errorMessage = `表不存在或无法访问。${error.message}`;
    } else if (error.message.includes('syntax error')) {
      errorMessage = `SQL语法错误: ${error.message}`;
    } else if (error.message.includes('no such table')) {
      errorMessage = `表不存在: ${error.message.split(':').pop()?.trim()}`;
    } else if (error.message.includes('permission')) {
      errorMessage = `权限错误: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * 从错误对象获取用户友好的错误消息
 * @param error 错误对象
 * @returns 用户友好的错误消息
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
    return JSON.stringify(error);
  }
  return 'Unknown error occurred';
}

/**
 * 检查是否为SQL注入攻击尝试
 * @param sql SQL语句
 * @returns 是否为可能的注入攻击
 */
export function detectSqlInjection(sql: string): boolean {
  // 简单检测SQL注入的模式
  const injectionPatterns = [
    /'\s*OR\s*'1'='1/i,       // 'OR '1'='1
    /'\s*OR\s*1=1/i,          // 'OR 1=1
    /'\s*;\s*DROP\s+TABLE/i,  // '; DROP TABLE
    /'\s*;\s*DELETE\s+FROM/i, // '; DELETE FROM
    /'\s*UNION\s+SELECT/i,    // UNION SELECT
    /'\s*--/,                 // SQL注释符
    /'\s*;\s*--/              // SQL结束符和注释符组合
  ];
  
  return injectionPatterns.some(pattern => pattern.test(sql));
}

/**
 * 准备SQL语句，确保表名正确引用
 * @param sql SQL语句
 * @returns 安全引用的SQL语句
 */
export function prepareSqlWithSafeTableNames(sql: string): string {
  // 这是一个简化实现，完整实现需要实际的SQL解析器
  // 查找FROM和JOIN后面的表名，并确保它们用双引号包裹
  return sql.replace(/\b(FROM|JOIN)\s+(\w+)/gi, (match, keyword, tableName) => {
    // 保留关键字的原始大小写
    const originalKeyword = match.substring(0, keyword.length);
    
    // 如果表名已经有引号，不做修改
    if (tableName.startsWith('"') && tableName.endsWith('"')) {
      return match;
    }
    // 否则添加双引号，但保留原始关键字的大小写
    return `${originalKeyword} "${tableName}"`;
  });
}
