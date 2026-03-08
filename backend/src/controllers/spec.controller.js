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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorder = exports.getActive = exports.remove = exports.update = exports.create = exports.getById = exports.getList = void 0;
var specService = require("../services/spec.service");
var response_1 = require("../lib/response");
// 获取规格类型列表
var getList = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var includeInactive, types, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                includeInactive = req.query.includeInactive === 'true';
                return [4 /*yield*/, specService.getSpecTypeList(includeInactive)];
            case 1:
                types = _a.sent();
                return [2 /*return*/, (0, response_1.success)(res, types)];
            case 2:
                error_1 = _a.sent();
                next(error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getList = getList;
// 获取单个规格类型
var getById = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, type, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return [2 /*return*/, (0, response_1.fail)(res, 400, '无效的规格类型ID')];
                }
                return [4 /*yield*/, specService.getSpecTypeById(id)];
            case 1:
                type = _a.sent();
                return [2 /*return*/, (0, response_1.success)(res, type)];
            case 2:
                error_2 = _a.sent();
                next(error_2);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getById = getById;
// 创建规格类型
var create = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, sort, type, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, name_1 = _a.name, sort = _a.sort;
                if (!name_1 || !name_1.trim()) {
                    return [2 /*return*/, (0, response_1.fail)(res, 400, '规格类型名称不能为空')];
                }
                return [4 /*yield*/, specService.createSpecType({
                        name: name_1.trim(),
                        sort: sort,
                    })];
            case 1:
                type = _b.sent();
                return [2 /*return*/, (0, response_1.success)(res, type, '创建成功')];
            case 2:
                error_3 = _b.sent();
                next(error_3);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.create = create;
// 更新规格类型
var update = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, type, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return [2 /*return*/, (0, response_1.fail)(res, 400, '无效的规格类型ID')];
                }
                return [4 /*yield*/, specService.updateSpecType(id, req.body)];
            case 1:
                type = _a.sent();
                return [2 /*return*/, (0, response_1.success)(res, type, '更新成功')];
            case 2:
                error_4 = _a.sent();
                next(error_4);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.update = update;
// 删除规格类型
var remove = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return [2 /*return*/, (0, response_1.fail)(res, 400, '无效的规格类型ID')];
                }
                return [4 /*yield*/, specService.deleteSpecType(id)];
            case 1:
                _a.sent();
                return [2 /*return*/, (0, response_1.success)(res, null, '删除成功')];
            case 2:
                error_5 = _a.sent();
                next(error_5);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.remove = remove;
// 获取所有启用的规格类型（用于 SKU 创建时选择）
var getActive = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var types, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, specService.getActiveSpecTypes()];
            case 1:
                types = _a.sent();
                return [2 /*return*/, (0, response_1.success)(res, types)];
            case 2:
                error_6 = _a.sent();
                next(error_6);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getActive = getActive;
// 批量更新排序
var reorder = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var ids, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                ids = req.body.ids;
                if (!Array.isArray(ids) || ids.length === 0) {
                    return [2 /*return*/, (0, response_1.fail)(res, 400, '无效的规格类型ID列表')];
                }
                return [4 /*yield*/, specService.reorderSpecTypes(ids)];
            case 1:
                _a.sent();
                return [2 /*return*/, (0, response_1.success)(res, null, '排序已更新')];
            case 2:
                error_7 = _a.sent();
                next(error_7);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.reorder = reorder;
