import { describe, it, expect } from 'vitest'
import { generateToken, verifyToken } from '../jwt'

describe('JWT Utils', () => {
  const payload = { userId: 1, username: 'admin', role: 'admin' }

  it('should generate a valid token', () => {
    const token = generateToken(payload)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
  })

  it('should verify and decode token', () => {
    const token = generateToken(payload)
    const decoded = verifyToken(token)
    expect(decoded).toBeDefined()
    expect(decoded?.userId).toBe(1)
    expect(decoded?.username).toBe('admin')
  })

  it('should return null for invalid token', () => {
    const decoded = verifyToken('invalid-token')
    expect(decoded).toBeNull()
  })
})
