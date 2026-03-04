import { Router } from 'express'
import * as saleController from '../controllers/sale.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// 获取订单列表
router.get('/', authMiddleware, saleController.getList)

// 获取订单详情
router.get('/:id', authMiddleware, saleController.getById)

// 创建销售订单（直接确认）
router.post('/', authMiddleware, rbacMiddleware(['admin', 'sales']), saleController.create)

// 创建草稿订单
router.post('/draft', authMiddleware, rbacMiddleware(['admin', 'sales']), saleController.createDraft)

// 更新草稿订单
router.put('/:id', authMiddleware, rbacMiddleware(['admin', 'sales']), saleController.update)

// 确认订单
router.post('/:id/confirm', authMiddleware, rbacMiddleware(['admin', 'sales']), saleController.confirm)

// 取消订单
router.post('/:id/cancel', authMiddleware, rbacMiddleware(['admin', 'sales']), saleController.cancel)

// 获取打印数据
router.get('/:id/print', authMiddleware, saleController.getPrint)

export default router
