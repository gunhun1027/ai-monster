// JWT工具函数
import jwt from 'jsonwebtoken'

const rawSecret = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '7d' // 7天有效期

if (!rawSecret) {
  throw new Error('环境变量 JWT_SECRET 未设置，请在 .env 文件中配置')
}

const JWT_SECRET = rawSecret // TypeScript 类型收窄为 string

// 生成JWT token
export function generateToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// 验证JWT token
export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; role: string }
    return decoded
  } catch {
    return null
  }
}
