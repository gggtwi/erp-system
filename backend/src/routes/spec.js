"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var specController = require("../controllers/spec.controller");
var auth_1 = require("../middlewares/auth");
var router = (0, express_1.Router)();
// 获取规格类型列表
router.get('/', auth_1.authMiddleware, specController.getList);
// 获取启用的规格类型（用于 SKU 创建）
router.get('/active', auth_1.authMiddleware, specController.getActive);
// 获取单个规格类型
router.get('/:id', auth_1.authMiddleware, specController.getById);
// 创建规格类型（仅管理员）
router.post('/', auth_1.authMiddleware, (0, auth_1.rbacMiddleware)(['admin']), specController.create);
// 批量更新排序（仅管理员）
router.put('/reorder', auth_1.authMiddleware, (0, auth_1.rbacMiddleware)(['admin']), specController.reorder);
// 更新规格类型（仅管理员）
router.put('/:id', auth_1.authMiddleware, (0, auth_1.rbacMiddleware)(['admin']), specController.update);
// 删除规格类型（仅管理员）
router.delete('/:id', auth_1.authMiddleware, (0, auth_1.rbacMiddleware)(['admin']), specController.remove);
exports.default = router;
