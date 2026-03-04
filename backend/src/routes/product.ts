import { Router } from 'express'
import * as productController from '../controllers/product.controller'
import { authMiddleware, rbacMiddleware } from '../middlewares/auth'

const router = Router()

// 获取商品列表
router.get('/', authMiddleware, productController.getList)

// 获取单个商品（按ID）
router.get('/id/:id', authMiddleware, productController.getById)

// 获取单个商品（按编码）
router.get('/code/:code', authMiddleware, productController.getByCode)

// 创建商品（管理员、采购）
router.post('/', authMiddleware, rbacMiddleware(['admin', 'purchase']), productController.create)

// 更新商品（管理员、采购）
router.put('/:id', authMiddleware, rbacMiddleware(['admin', 'purchase']), productController.update)

// 删除商品（仅管理员）
router.delete('/:id', authMiddleware, rbacMiddleware(['admin']), productController.remove)

export default router
