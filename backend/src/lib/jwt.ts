import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: number
  username: string
  role: string
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  })
}

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload
  } catch {
    return null
  }
}
