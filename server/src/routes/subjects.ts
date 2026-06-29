// 学科路由
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// 获取学科列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { questions: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json({
      subjects: subjects.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        questionCount: s._count.questions,
      })),
    })
  } catch (error) {
    console.error('获取学科列表失败:', error)
    res.status(500).json({ error: '获取学科列表失败' })
  }
})

export default router
