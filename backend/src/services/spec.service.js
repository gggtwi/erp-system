"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderSpecTypes = exports.getActiveSpecTypes = exports.deleteSpecType = exports.updateSpecType = exports.createSpecType = exports.getSpecTypeById = exports.getSpecTypeList = void 0;
var prisma_1 = require("../lib/prisma");
var error_1 = require("../middlewares/error");
// 获取规格类型列表
var getSpecTypeList = function () {
    var args_1 = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args_1[_i] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (includeInactive) {
        var types;
        if (includeInactive === void 0) { includeInactive = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.prisma.specType.findMany({
                        where: includeInactive ? {} : { active: true },
                        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
                    })];
                case 1:
                    types = _a.sent();
                    return [2 /*return*/, types];
            }
        });
    });
};
exports.getSpecTypeList = getSpecTypeList;
// 获取单个规格类型
var getSpecTypeById = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var type;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.specType.findUnique({
                    where: { id: id },
                })];
            case 1:
                type = _a.sent();
                if (!type) {
                    throw new error_1.AppError(404, '规格类型不存在');
                }
                return [2 /*return*/, type];
        }
    });
}); };
exports.getSpecTypeById = getSpecTypeById;
// 创建规格类型
var createSpecType = function (data) { return __awaiter(void 0, void 0, void 0, function () {
    var existing, type;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.specType.findFirst({
                    where: { name: data.name },
                })];
            case 1:
                existing = _a.sent();
                if (existing) {
                    throw new error_1.AppError(400, '规格类型名称已存在');
                }
                return [4 /*yield*/, prisma_1.prisma.specType.create({
                        data: {
                            name: data.name,
                            sort: data.sort || 0,
                        },
                    })];
            case 2:
                type = _a.sent();
                return [2 /*return*/, type];
        }
    });
}); };
exports.createSpecType = createSpecType;
// 更新规格类型
var updateSpecType = function (id, data) { return __awaiter(void 0, void 0, void 0, function () {
    var type, existing, updated;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.specType.findUnique({
                    where: { id: id },
                })];
            case 1:
                type = _a.sent();
                if (!type) {
                    throw new error_1.AppError(404, '规格类型不存在');
                }
                if (!(data.name && data.name !== type.name)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma_1.prisma.specType.findFirst({
                        where: { name: data.name },
                    })];
            case 2:
                existing = _a.sent();
                if (existing) {
                    throw new error_1.AppError(400, '规格类型名称已存在');
                }
                _a.label = 3;
            case 3: return [4 /*yield*/, prisma_1.prisma.specType.update({
                    where: { id: id },
                    data: data,
                })];
            case 4:
                updated = _a.sent();
                return [2 /*return*/, updated];
        }
    });
}); };
exports.updateSpecType = updateSpecType;
// 删除规格类型
var deleteSpecType = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var type;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.specType.findUnique({
                    where: { id: id },
                })];
            case 1:
                type = _a.sent();
                if (!type) {
                    throw new error_1.AppError(404, '规格类型不存在');
                }
                return [4 /*yield*/, prisma_1.prisma.specType.delete({
                        where: { id: id },
                    })];
            case 2:
                _a.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); };
exports.deleteSpecType = deleteSpecType;
// 获取所有启用的规格类型（用于 SKU 创建时选择）
var getActiveSpecTypes = function () { return __awaiter(void 0, void 0, void 0, function () {
    var types;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.specType.findMany({
                    where: { active: true },
                    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
                })];
            case 1:
                types = _a.sent();
                return [2 /*return*/, types];
        }
    });
}); };
exports.getActiveSpecTypes = getActiveSpecTypes;
// 批量更新排序
var reorderSpecTypes = function (ids) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: 
            // 使用事务批量更新排序值
            return [4 /*yield*/, prisma_1.prisma.$transaction(ids.map(function (id, index) {
                    return prisma_1.prisma.specType.update({
                        where: { id: id },
                        data: { sort: index },
                    });
                }))];
            case 1:
                // 使用事务批量更新排序值
                _a.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); };
exports.reorderSpecTypes = reorderSpecTypes;
