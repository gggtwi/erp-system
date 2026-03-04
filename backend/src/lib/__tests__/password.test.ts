import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from '../password'

describe('Password Utils', () => {
  const password = 'admin123'

  it('should hash password', async () => {
    const hash = await hashPassword(password)
    expect(hash).toBeDefined()
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50)
  })

  it('should verify correct password', async () => {
    const hash = await hashPassword(password)
    const isMatch = await comparePassword(password, hash)
    expect(isMatch).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await hashPassword(password)
    const isMatch = await comparePassword('wrong-password', hash)
    expect(isMatch).toBe(false)
  })
})
