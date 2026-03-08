"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = exports.fail = exports.success = void 0;
var success = function (res, data, message) {
    if (message === void 0) { message = 'success'; }
    var response = {
        code: 0,
        message: message,
        data: data,
    };
    return res.json(response);
};
exports.success = success;
var fail = function (res, code, message) {
    var response = {
        code: code,
        message: message,
    };
    // 使用业务码作为 HTTP 状态码，但限制在有效的 HTTP 状态码范围内
    var httpStatus = code >= 400 && code < 600 ? code : 400;
    return res.status(httpStatus).json(response);
};
exports.fail = fail;
var paginate = function (res, list, total, page, pageSize) {
    return (0, exports.success)(res, {
        list: list,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize),
    });
};
exports.paginate = paginate;
