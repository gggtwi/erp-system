"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacMiddleware = exports.authMiddleware = void 0;
var jwt_1 = require("../lib/jwt");
var response_1 = require("../lib/response");
var authMiddleware = function (req, res, next) {
    var authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return (0, response_1.fail)(res, 401, '未登录');
    }
    var token = authHeader.replace('Bearer ', '');
    var decoded = (0, jwt_1.verifyToken)(token);
    if (!decoded) {
        return (0, response_1.fail)(res, 401, 'Token 无效或已过期');
    }
    req.user = decoded;
    next();
};
exports.authMiddleware = authMiddleware;
var rbacMiddleware = function (roles) {
    return function (req, res, next) {
        if (!req.user) {
            return (0, response_1.fail)(res, 403, '无权限访问');
        }
        // 超级管理员拥有所有权限
        if (req.user.role === 'super_admin') {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            return (0, response_1.fail)(res, 403, '无权限访问');
        }
        next();
    };
};
exports.rbacMiddleware = rbacMiddleware;
