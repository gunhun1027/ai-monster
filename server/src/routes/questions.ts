// 题目路由 - 获取随机题目（支持难度自适应）
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { selectQuestionDifficulty } from '../utils/evolution'

const router = Router()

function safeJsonParse(json: string, fallback: unknown = null) {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

// 获取随机题目（不含答案字段，支持 choice 和 fillblank 类型混合，支持难度筛选）
router.get('/random', authMiddleware, async (req: Request, res: Response) => {
  try {
    const subjectId = req.query.subjectId as string
    const count = Math.max(1, Math.min(parseInt(req.query.count as string) || 10, 50))
    const adaptive = req.query.adaptive === 'true'

    if (!subjectId) {
      return res.status(400).json({ error: '缺少学科ID参数' })
    }

    let targetDifficulty: number | null = null

    // 如果启用自适应难度
    if (adaptive) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { abilityScore: true },
      })
      if (user) {
        targetDifficulty = selectQuestionDifficulty(user.abilityScore)
      }
    }

    let questions: Array<{
      id: string; content: string; options: string; difficulty: number; subjectId: string; type: string | null
    }>

    if (targetDifficulty) {
      // 混合难度：70% 目标难度, 20% 目标-1, 10% 目标+1
      const mainDiff = targetDifficulty
      const easyDiff = Math.max(1, mainDiff - 1)
      const hardDiff = Math.min(5, mainDiff + 1)

      const mainCount = Math.ceil(count * 0.7)
      const easyCount = Math.ceil(count * 0.2)
      const hardCount = count - mainCount - easyCount

      const [mainQs, easyQs, hardQs] = await Promise.all([
        prisma.$queryRaw<Array<{
          id: string; content: string; options: string; difficulty: number; subjectId: string; type: string | null
        }>>`
          SELECT id, content, options, difficulty, "subjectId", type
          FROM "Question"
          WHERE "subjectId" = ${subjectId} AND "isActive" = true AND difficulty = ${mainDiff}
          ORDER BY RANDOM()
          LIMIT ${mainCount}
        `,
        prisma.$queryRaw<Array<{
          id: string; content: string; options: string; difficulty: number; subjectId: string; type: string | null
        }>>`
          SELECT id, content, options, difficulty, "subjectId", type
          FROM "Question"
          WHERE "subjectId" = ${subjectId} AND "isActive" = true AND difficulty = ${easyDiff}
          ORDER BY RANDOM()
          LIMIT ${easyCount}
        `,
        prisma.$queryRaw<Array<{
          id: string; content: string; options: string; difficulty: number; subjectId: string; type: string | null
        }>>`
          SELECT id, content, options, difficulty, "subjectId", type
          FROM "Question"
          WHERE "subjectId" = ${subjectId} AND "isActive" = true AND difficulty = ${hardDiff}
          ORDER BY RANDOM()
          LIMIT ${hardCount}
        `,
      ])

      questions = [...easyQs, ...mainQs, ...hardQs].sort(() => Math.random() - 0.5)

      // 如果混合查询结果不够，回退到随机
      if (questions.length === 0) {
        questions = await prisma.$queryRaw`
          SELECT id, content, options, difficulty, "subjectId", type
          FROM "Question"
          WHERE "subjectId" = ${subjectId} AND "isActive" = true
          ORDER BY RANDOM()
          LIMIT ${count}
        `
      }
    } else {
      questions = await prisma.$queryRaw`
        SELECT id, content, options, difficulty, "subjectId", type
        FROM "Question"
        WHERE "subjectId" = ${subjectId} AND "isActive" = true
        ORDER BY RANDOM()
        LIMIT ${count}
      `
    }

    if (questions.length === 0) {
      return res.status(404).json({ error: '该学科暂无题目' })
    }

    res.json({
      questions: questions.map((q) => ({
        id: q.id,
        content: q.content,
        options: safeJsonParse(q.options, []),
        difficulty: q.difficulty,
        subjectId: q.subjectId,
        type: q.type || 'choice',
      })),
    })
  } catch (error) {
    console.error('获取题目失败:', error)
    res.status(500).json({ error: '获取题目失败' })
  }
})

export default router
