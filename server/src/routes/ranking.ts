// 排行榜路由
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { EVOLUTION_STAGES } from '../utils/evolution'

const router = Router()

const VALID_RANK_TYPES = ['level', 'streak', 'correct', 'combo'] as const
type RankType = typeof VALID_RANK_TYPES[number]

const ORDER_BY_MAP: Record<RankType, Prisma.UserOrderByWithRelationInput> = {
  level: { monsterLevel: 'desc' },
  streak: { streakDays: 'desc' },
  correct: { totalCorrect: 'desc' },
  combo: { maxCombo: 'desc' },
}

const RANK_FIELD_MAP: Record<RankType, keyof Prisma.UserWhereInput> = {
  level: 'monsterLevel',
  streak: 'streakDays',
  correct: 'totalCorrect',
  combo: 'maxCombo',
}

// 获取排行榜
// type: level | streak | correct | combo
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rawType = (req.query.type as string) || 'level'
    if (!VALID_RANK_TYPES.includes(rawType as RankType)) {
      return res.status(400).json({ error: '无效的排行榜类型' })
    }
    const type = rawType as RankType
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)

    const orderBy = ORDER_BY_MAP[type]

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'user' },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          monsterName: true,
          monsterStage: true,
          monsterLevel: true,
          streakDays: true,
          totalCorrect: true,
          totalQuiz: true,
          maxCombo: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: { role: 'user' } }),
    ])

    // 获取当前用户排名（管理员不参与排名）
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        role: true,
        monsterLevel: true,
        streakDays: true,
        totalCorrect: true,
        maxCombo: true,
      },
    })

    let myRank = null
    if (currentUser && currentUser.role !== 'admin') {
      const valueMap: Record<RankType, number> = {
        level: currentUser.monsterLevel,
        streak: currentUser.streakDays,
        correct: currentUser.totalCorrect,
        combo: currentUser.maxCombo,
      }
      const myValue = valueMap[type]
      const rankField = RANK_FIELD_MAP[type]
      const higherCount = await prisma.user.count({
        where: {
          role: 'user',
          [rankField]: { gt: myValue },
        },
      })
      myRank = {
        rank: higherCount + 1,
        value: myValue,
      }
    }

    res.json({
      ranking: users.map((u, index) => ({
        rank: (page - 1) * limit + index + 1,
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        monsterName: u.monsterName,
        monsterStage: u.monsterStage,
        stageEmoji: EVOLUTION_STAGES[u.monsterStage as keyof typeof EVOLUTION_STAGES]?.emoji,
        monsterLevel: u.monsterLevel,
        streakDays: u.streakDays,
        totalCorrect: u.totalCorrect,
        totalQuiz: u.totalQuiz,
        maxCombo: u.maxCombo,
        isMe: u.id === req.userId,
      })),
      myRank,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取排行榜失败:', error)
    res.status(500).json({ error: '获取排行榜失败' })
  }
})

export default router
