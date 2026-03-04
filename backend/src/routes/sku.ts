import { Router } from 'express'
import * as skuController from '../controllers/sku.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// 获取 SKU 列表
router.get('/', authMiddleware, skuController.getList)

// 获取单个 SKU（按ID）
router.get('/id/:id', authMiddleware, skuController.getById)

// 获取单个 SKU（按编码）
router.get('/code/:code', authMiddleware, skuController.getByCode)

// 获取 SKU 库存信息
router.get('/:id/inventory', authMiddleware, skuController.getInventory)

// 创建 SKU（管理员、采购）
router.post('/', authMiddleware, rbacMiddleware(['admin', 'purchase']), skuController.create)

// 更新 SKU（管理员、采购）
router.put('/:id', authMiddleware, rbacMiddleware(['admin', 'purchase']), skuController.update)

// 删除 SKU（仅管理员）
router.delete('/:id', authMiddleware, rbacMiddleware(['admin']), skuController.remove)

// 库存调整（管理员、仓库）
router.post('/:id/inventory/adjust', authMiddleware, rbacMiddleware(['admin', 'warehouse']), skuController.adjustInventory)

export default router
