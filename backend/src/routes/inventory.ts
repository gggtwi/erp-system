import { Router } from 'express'
import * as inventoryController from '../controllers/inventory.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// ==================== 库存查询 ====================

// 获取库存统计
router.get('/stats', authMiddleware, inventoryController.getInventoryStats)

// 获取库存列表（所有登录用户）
router.get('/', authMiddleware, inventoryController.getInventoryList)

// 获取库存预警列表
router.get('/warning', authMiddleware, inventoryController.getInventoryWarning)

// 获取库存详情
router.get('/:skuId', authMiddleware, inventoryController.getInventoryDetail)

// ==================== 库存操作 ====================

// 库存调整（管理员、仓库）
router.post(
  '/adjust',
  authMiddleware,
  rbacMiddleware(['admin', 'warehouse']),
  inventoryController.adjustInventory
)

// ==================== 库存流水 ====================

// 获取库存流水
router.get('/logs/list', authMiddleware, inventoryController.getInventoryLogs)

// ==================== 序列号管理 ====================

// 获取序列号列表
router.get('/serials/list', authMiddleware, inventoryController.getSerialNumberList)

// 录入序列号（管理员、仓库）
router.post(
  '/serials',
  authMiddleware,
  rbacMiddleware(['admin', 'warehouse']),
  inventoryController.createSerialNumbers
)

// 获取序列号详情（保修查询）
router.get(
  '/serials/:serialNo',
  authMiddleware,
  inventoryController.getSerialNumberDetail
)

export default router
