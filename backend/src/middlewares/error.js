"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwError = exports.AppError = exports.errorHandler = void 0;
var response_1 = require("../lib/response");
var client_1 = require("@prisma/client");
var errorHandler = function (err, req, res, next) {
    var _a, _b;
    console.error('Error:', err);
    // 如果是 AppError，直接返回自定义错误消息
    if (err instanceof AppError) {
        return (0, response_1.fail)(res, err.code, err.message);
    }
    // Prisma 错误处理 - 使用 Prisma 错误代码
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint violation
        if (err.code === 'P2002') {
            var targetField = ((_b = (_a = err.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b[0]) || '';
            if (targetField.toLowerCase().includes('code')) {
                return (0, response_1.fail)(res, 400, '编码已存在');
            }
            return (0, response_1.fail)(res, 400, '数据已存在');
        }
    }
    // 兼容旧格式错误消息
    if (err.message.includes('Unique constraint')) {
        var fieldMatch = err.message.match(/Unique constraint failed on the fields?: \(([^)]+)\)/);
        if (fieldMatch) {
            var field = fieldMatch[1];
            if (field.toLowerCase().includes('code')) {
                return (0, response_1.fail)(res, 400, '编码已存在');
            }
        }
        return (0, response_1.fail)(res, 400, '数据已存在');
    }
    if (err.message.includes('Foreign key constraint')) {
        return (0, response_1.fail)(res, 400, '关联数据不存在');
    }
    return (0, response_1.fail)(res, 500, process.env.NODE_ENV === 'production' ? '服务器错误' : err.message);
};
exports.errorHandler = errorHandler;
var AppError = /** @class */ (function (_super) {
    __extends(AppError, _super);
    function AppError(code, message) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.name = 'AppError';
        return _this;
    }
    return AppError;
}(Error));
exports.AppError = AppError;
var throwError = function (code, message) {
    throw new AppError(code, message);
};
exports.throwError = throwError;
