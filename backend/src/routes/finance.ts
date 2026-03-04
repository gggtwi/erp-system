import { Router } from 'express'
import * as financeController from '../controllers/finance.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// ==================== 应收账款路由 ====================

// 获取应收账款列表
router.get('/receivables', authMiddleware, rbacMiddleware(['admin', 'finance']), financeController.getReceivableList)

// 获取应收账款统计
router.get('/receivables/stats', authMiddleware, rbacMiddleware(['admin', 'finance']), financeController.getReceivableStats)

// 获取应收账款详情
router.get('/receivables/:id', authMiddleware, rbacMiddleware(['admin', 'finance']), financeController.getReceivableById)

// 获取客户欠款详情
router.get('/customers/:id/debt', authMiddleware, rbacMiddleware(['admin', 'finance', 'sales']), financeController.getCustomerDebt)

// ==================== 收款路由 ====================

// 创建收款记录
router.post('/payments', authMiddleware, rbacMiddleware(['admin', 'finance']), financeController.createPayment)

// 获取收款记录列表
router.get('/payments', authMiddleware, rbacMiddleware(['admin', 'finance']), financeController.getPaymentList)

// 获取收款统计
router.get('/payments/stats', authMiddleware, rbacMiddleware(['admin', 'finance']), financeController.getPaymentStats)

// 获取收款记录详情
router.get('/payments/:id', authMiddleware, rbacMiddleware(['admin', 'finance']), financeController.getPaymentById)

export default router
