import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth'

const router = Router()

// 公开路由
router.post('/login', authController.login)

// 需要认证的路由
router.get('/me', authMiddleware, authController.getCurrentUser)
router.put('/password', authMiddleware, authController.changePassword)

export default router
