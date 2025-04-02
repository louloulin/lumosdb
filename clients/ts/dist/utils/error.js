"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwIfError = throwIfError;
/**
 * 检查API响应是否出错，如果有错误则抛出异常
 * @param response API响应对象
 * @throws 如果响应失败，则抛出相应的错误
 */
function throwIfError(response) {
    var _a;
    if (!response.success) {
        throw new Error(((_a = response.error) === null || _a === void 0 ? void 0 : _a.message) || 'API request failed');
    }
}
