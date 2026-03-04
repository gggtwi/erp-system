import { Router } from 'express'
import * as userController from '../controllers/user.controller'
import { authMiddleware } from '../middlewares/auth'

const router = Router()

// 所有路由都需要认证
router.use(authMiddleware)

// 获取可创建的角色列表
router.get('/creatable-roles', userController.getCreatableRoles)

// 创建用户
router.post('/', userController.createUser)

// 获取用户列表
router.get('/', userController.getUsers)

// 获取单个用户
router.get('/:id', userController.getUserById)

// 修改用户密码
router.put('/:id/password', userController.changePassword)

export default router
