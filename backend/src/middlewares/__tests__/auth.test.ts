import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { authMiddleware, rbacMiddleware } from '../auth'
import { generateToken } from '../../lib/jwt'

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = { headers: {} }
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    mockNext = vi.fn()
  })

  it('should reject request without token', () => {
    authMiddleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }))
  })

  it('should accept valid token', () => {
    const token = generateToken({ userId: 1, username: 'admin', role: 'admin' })
    mockReq.headers = { authorization: `Bearer ${token}` }
    
    authMiddleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockNext).toHaveBeenCalled()
    expect(mockReq.user).toBeDefined()
  })
})

describe('RBAC Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = { user: { userId: 1, username: 'sales', role: 'sales' } } as any
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    mockNext = vi.fn()
  })

  it('should allow user with correct role', () => {
    const middleware = rbacMiddleware(['admin', 'sales'])
    middleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockNext).toHaveBeenCalled()
  })

  it('should reject user without required role', () => {
    const middleware = rbacMiddleware(['admin'])
    middleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockRes.status).toHaveBeenCalledWith(403)
  })
})
