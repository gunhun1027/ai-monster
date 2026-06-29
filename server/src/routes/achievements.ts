// 成就路由
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 获取成就列表（含解锁状态）
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      include: {
        users: {
          where: { userId: req.userId },
          select: { unlockedAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json({
      achievements: achievements.map((a) => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        description: a.description,
        condition: a.condition,
        threshold: a.threshold,
        unlocked: a.users.length > 0,
        unlockedAt: a.users[0]?.unlockedAt || null,
      })),
    })
  } catch (error) {
    console.error('获取成就列表失败:', error)
    res.status(500).json({ error: '获取成就列表失败' })
  }
})

export default router
