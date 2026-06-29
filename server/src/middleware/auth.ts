// JWT认证中间件
import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'

// 扩展Request类型，添加user字段
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: string
    }
  }
}

// 普通用户认证中间件
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或登录已过期' })
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }

  req.userId = decoded.userId
  req.userRole = decoded.role
  next()
}

// 管理员认证中间件
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  authMiddleware(req, res, () => {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: '无权限访问' })
    }
    next()
  })
}
