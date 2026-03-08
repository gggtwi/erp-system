import { Router } from 'express'
import * as specController from '../controllers/spec.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// 获取规格类型列表
router.get('/', authMiddleware, specController.getList)

// 获取启用的规格类型（用于 SKU 创建）
router.get('/active', authMiddleware, specController.getActive)

// 获取单个规格类型
router.get('/:id', authMiddleware, specController.getById)

// 创建规格类型（仅管理员）
router.post('/', authMiddleware, rbacMiddleware(['admin']), specController.create)

// 批量更新排序（仅管理员）
router.put('/reorder', authMiddleware, rbacMiddleware(['admin']), specController.reorder)

// 更新规格类型（仅管理员）
router.put('/:id', authMiddleware, rbacMiddleware(['admin']), specController.update)

// 删除规格类型（仅管理员）
router.delete('/:id', authMiddleware, rbacMiddleware(['admin']), specController.remove)

export default router
