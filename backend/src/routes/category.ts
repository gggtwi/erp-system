import { Router } from 'express'
import * as categoryController from '../controllers/category.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// 获取分类列表（树形结构）
router.get('/', authMiddleware, categoryController.getList)

// 获取单个分类
router.get('/:id', authMiddleware, categoryController.getById)

// 创建分类（仅管理员）
router.post('/', authMiddleware, rbacMiddleware(['admin']), categoryController.create)

// 更新分类（仅管理员）
router.put('/:id', authMiddleware, rbacMiddleware(['admin']), categoryController.update)

// 删除分类（仅管理员）
router.delete('/:id', authMiddleware, rbacMiddleware(['admin']), categoryController.remove)

export default router
