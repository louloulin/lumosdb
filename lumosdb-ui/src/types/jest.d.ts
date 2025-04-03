/**
 * Jest类型声明
 */

import 'jest';

declare global {
  /**
   * Jest全局变量
   */
  namespace jest {
    /**
     * 模拟函数
     */
    interface Mock<T = any, Y extends any[] = any> {
      mockClear(): this;
      mockReset(): this;
      mockRestore(): void;
      mockImplementation(fn: (...args: Y) => T): this;
      mockImplementationOnce(fn: (...args: Y) => T): this;
      mockReturnThis(): this;
      mockReturnValue(value: T): this;
      mockReturnValueOnce(value: T): this;
      mockResolvedValue(value: Awaited<T>): this;
      mockResolvedValueOnce(value: Awaited<T>): this;
      mockRejectedValue(reason: any): this;
      mockRejectedValueOnce(reason: any): this;
    }

    /**
     * 模拟函数类型
     */
    type MockFunction<T extends (...args: any) => any> = {
      (...args: Parameters<T>): ReturnType<T>;
    } & Mock<ReturnType<T>, Parameters<T>>;
  }

  /**
   * 断言函数
   */
  function expect<T = any>(actual: T): jest.Matchers<T>;
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void | Promise<void>, timeout?: number): void;
  function beforeEach(fn: () => void | Promise<void>): void;
  function afterEach(fn: () => void | Promise<void>): void;
  function beforeAll(fn: () => void | Promise<void>): void;
  function afterAll(fn: () => void | Promise<void>): void;
} 