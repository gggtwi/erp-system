import { sign, verify } from 'jsonwebtoken'

interface JwtPayload {
  userId: number
  username: string
  role: string
}

export const generateToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET || 'secret'
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return sign(payload, secret, { expiresIn: expiresIn as any })
}

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload
  } catch {
    return null
  }
}
