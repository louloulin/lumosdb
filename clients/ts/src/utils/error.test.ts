import { throwIfError, getUserFriendlyErrorMessage, detectSqlInjection, prepareSqlWithSafeTableNames } from './error';
import { ApiResponse } from '../types/core';

describe('Error Utils', () => {
  describe('throwIfError', () => {
    test('should not throw error when response is successful', () => {
      const response: ApiResponse<string> = {
        success: true,
        data: 'test data'
      };
      
      expect(() => throwIfError(response)).not.toThrow();
    });
    
    test('should throw error when response is not successful', () => {
      const response: ApiResponse<string> = {
        success: false,
        error: { code: 'ERROR', message: 'Test error' }
      };
      
      expect(() => throwIfError(response)).toThrow('Test error');
    });
    
    test('should provide helpful message for SELECT query in execute error', () => {
      const response: ApiResponse<any> = {
        success: false,
        error: { 
          code: 'DATABASE_EXECUTE_ERROR', 
          message: 'Execute failed: SQLite error: Execute returned results - did you mean to call query?' 
        }
      };
      
      expect(() => throwIfError(response)).toThrow('尝试使用execute执行SELECT查询。请使用query方法代替。');
    });
    
    test('should provide helpful message for table not found error', () => {
      const response: ApiResponse<any> = {
        success: false,
        error: { 
          code: 'TABLE_NOT_FOUND', 
          message: "Table 'test_table' not found" 
        }
      };
      
      expect(() => throwIfError(response)).toThrow('表不存在或无法访问。');
    });
    
    test('should provide helpful message for SQL syntax error', () => {
      const response: ApiResponse<any> = {
        success: false,
        error: { 
          code: 'SQL_ERROR', 
          message: "near \"SELETC\": syntax error" 
        }
      };
      
      expect(() => throwIfError(response)).toThrow('SQL语法错误:');
    });
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    test('should extract message from Error object', () => {
      const error = new Error('Test error');
      expect(getUserFriendlyErrorMessage(error)).toBe('Test error');
    });
    
    test('should return string as is', () => {
      expect(getUserFriendlyErrorMessage('Test error')).toBe('Test error');
    });
    
    test('should extract message from object with message property', () => {
      const error = { message: 'Test error' };
      expect(getUserFriendlyErrorMessage(error)).toBe('Test error');
    });
    
    test('should stringify object without message property', () => {
      const error = { code: 'ERROR' };
      expect(getUserFriendlyErrorMessage(error)).toBe(JSON.stringify(error));
    });
    
    test('should handle null/undefined', () => {
      expect(getUserFriendlyErrorMessage(null)).toBe('Unknown error occurred');
      expect(getUserFriendlyErrorMessage(undefined)).toBe('Unknown error occurred');
    });
  });
  
  describe('detectSqlInjection', () => {
    test('should detect SQL injection attempts', () => {
      expect(detectSqlInjection("' OR '1'='1")).toBe(true);
      expect(detectSqlInjection("' OR 1=1")).toBe(true);
      expect(detectSqlInjection("'; DROP TABLE users; --")).toBe(true);
      expect(detectSqlInjection("' UNION SELECT * FROM users")).toBe(true);
    });
    
    test('should not flag legitimate SQL', () => {
      expect(detectSqlInjection("SELECT * FROM users")).toBe(false);
      expect(detectSqlInjection("INSERT INTO users (name) VALUES ('O''Reilly')")).toBe(false);
      expect(detectSqlInjection("SELECT * FROM orders WHERE status = 'DROPPED'")).toBe(false);
    });
  });
  
  describe('prepareSqlWithSafeTableNames', () => {
    test('should wrap table names in double quotes', () => {
      expect(prepareSqlWithSafeTableNames("SELECT * FROM users"))
        .toBe('SELECT * FROM "users"');
      
      expect(prepareSqlWithSafeTableNames("SELECT * FROM users JOIN orders ON users.id = orders.user_id"))
        .toBe('SELECT * FROM "users" JOIN "orders" ON users.id = orders.user_id');
    });
    
    test('should not modify already quoted table names', () => {
      expect(prepareSqlWithSafeTableNames('SELECT * FROM "users"'))
        .toBe('SELECT * FROM "users"');
    });
    
    test('should handle case variations', () => {
      expect(prepareSqlWithSafeTableNames("select * from users"))
        .toBe('select * from "users"');
      
      expect(prepareSqlWithSafeTableNames("SELECT * from users join orders on users.id = orders.user_id"))
        .toBe('SELECT * from "users" join "orders" on users.id = orders.user_id');
    });
  });
}); 