import { Router } from 'express'
import * as reportController from '../controllers/report.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// ==================== 销售报表 ====================

// 销售汇总报表
router.get('/sales/summary', authMiddleware, rbacMiddleware(['admin', 'finance', 'sales']), reportController.getSalesSummary)

// 销售明细报表
router.get('/sales/detail', authMiddleware, rbacMiddleware(['admin', 'finance', 'sales']), reportController.getSalesDetail)

// 销售排行榜
router.get('/sales/ranking', authMiddleware, rbacMiddleware(['admin', 'finance', 'sales']), reportController.getSalesRanking)

// ==================== 库存报表 ====================

// 库存汇总报表
router.get('/inventory/summary', authMiddleware, reportController.getInventorySummary)

// 库存预警报表
router.get('/inventory/warning', authMiddleware, rbacMiddleware(['admin', 'warehouse']), reportController.getInventoryWarning)

// ==================== 财务报表 ====================

// 应收账款报表
router.get('/finance/receivable', authMiddleware, rbacMiddleware(['admin', 'finance']), reportController.getReceivableReport)

// 利润分析报表
router.get('/profit/analysis', authMiddleware, rbacMiddleware(['admin', 'finance']), reportController.getProfitAnalysis)

export default router
