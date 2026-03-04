import { Router } from 'express'
import * as customerController from '../controllers/customer.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// 获取客户列表
router.get('/', authMiddleware, customerController.getList)

// 获取客户详情
router.get('/:id', authMiddleware, customerController.getById)

// 创建客户（管理员、销售）
router.post('/', authMiddleware, rbacMiddleware(['admin', 'sales']), customerController.create)

// 更新客户（管理员、销售）
router.put('/:id', authMiddleware, rbacMiddleware(['admin', 'sales']), customerController.update)

// 获取客户购买历史
router.get('/:id/history', authMiddleware, customerController.getHistory)

// 获取客户欠款信息
router.get('/:id/debt', authMiddleware, rbacMiddleware(['admin', 'finance', 'sales']), customerController.getDebt)

// 删除客户（仅管理员）
router.delete('/:id', authMiddleware, rbacMiddleware(['admin']), customerController.remove)

export default router
