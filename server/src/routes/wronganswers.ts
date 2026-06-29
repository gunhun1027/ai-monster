// 错题本路由
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 所有路由都需要登录
router.use(authMiddleware)

// 安全解析 JSON，避免非法 JSON 导致 500
function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

// 获取错题本列表（分页+筛选）
// GET /?page=1&limit=20&subjectId=&mastered=false
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
    const subjectId = req.query.subjectId as string
    const mastered = req.query.mastered as string // 'true' | 'false' | undefined

    const where: Prisma.WrongAnswerWhereInput = { userId }
    if (subjectId) where.subjectId = subjectId
    if (mastered === 'true') where.mastered = true
    else if (mastered === 'false') where.mastered = false

    const [items, total, masteredCount, unmasteredCount] = await Promise.all([
      prisma.wrongAnswer.findMany({
        where,
        orderBy: { lastWrongAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subject: { select: { name: true, icon: true } },
        },
      }),
      prisma.wrongAnswer.count({ where }),
      prisma.wrongAnswer.count({ where: { userId, mastered: true } }),
      prisma.wrongAnswer.count({ where: { userId, mastered: false } }),
    ])

    res.json({
      items: items.map((item) => ({
        ...item,
        options: safeJsonParse(item.options, []),
      })),
      total,
      masteredCount,
      unmasteredCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('获取错题列表失败:', error)
    res.status(500).json({ error: '获取错题列表失败' })
  }
})

// 标记错题为已掌握
// POST /:id/master
router.post('/:id/master', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const wrongAnswer = await prisma.wrongAnswer.findFirst({
      where: { id: req.params.id, userId },
    })
    if (!wrongAnswer) {
      return res.status(404).json({ error: '错题记录不存在' })
    }
    const updated = await prisma.wrongAnswer.update({
      where: { id: req.params.id },
      data: { mastered: true },
    })
    res.json({ mastered: updated.mastered })
  } catch (error) {
    console.error('标记掌握失败:', error)
    res.status(500).json({ error: '标记掌握失败' })
  }
})

// 获取错题复习模式题目（按 wrongCount 降序）
// GET /review?limit=10
router.get('/review', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)

    // 获取未掌握的错题，按 wrongCount 降序
    const wrongAnswers = await prisma.wrongAnswer.findMany({
      where: { userId, mastered: false },
      orderBy: { wrongCount: 'desc' },
      take: limit,
      include: {
        question: {
          select: {
            id: true,
            content: true,
            options: true,
            difficulty: true,
            subjectId: true,
            type: true,
            explanation: true,
            tags: true,
          },
        },
      },
    })

    res.json({
      questions: wrongAnswers.map((wa) => ({
        id: wa.question.id,
        content: wa.question.content,
        options: safeJsonParse(wa.question.options, []),
        difficulty: wa.question.difficulty,
        subjectId: wa.question.subjectId,
        type: wa.question.type || 'choice',
        explanation: wa.question.explanation,
        tags: safeJsonParse(wa.question.tags, []),
        wrongAnswerId: wa.id,
        wrongCount: wa.wrongCount,
      })),
    })
  } catch (error) {
    console.error('获取复习题目失败:', error)
    res.status(500).json({ error: '获取复习题目失败' })
  }
})

export default router
