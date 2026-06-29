// AI出题路由
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { generateQuestionsByAI, getAiStatus } from '../services/aiQuestion'
import type { AiQuestionConfig } from '../services/aiQuestion'

const router = Router()

// 已保存的AI题目类型（带真实数据库ID）
interface SavedAiQuestion {
  id: string
  subjectId: string
  content: string
  options: string[]
  answer: string
  difficulty: number
  type: string
  explanation: string
  tags: string[]
  isAiGenerated: boolean
  aiSource: string
}

// GET /api/ai-questions/status - 获取AI状态
router.get('/status', (req, res) => {
  res.json(getAiStatus())
})

// POST /api/ai-questions/generate - AI生成题目
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { subjectName, topic, difficulty, count, questionType, subjectId } = req.body

    // 参数校验
    if (!subjectName || !topic) {
      res.status(400).json({ error: '缺少必要参数：subjectName 和 topic' })
      return
    }

    const config: AiQuestionConfig = {
      subjectName: String(subjectName),
      topic: String(topic),
      difficulty: Math.min(5, Math.max(1, Number(difficulty) || 2)),
      count: Math.min(10, Math.max(1, Number(count) || 5)),
      questionType: (questionType as AiQuestionConfig['questionType']) || 'mixed',
    }

    // 调用AI生成题目
    const generatedQuestions = await generateQuestionsByAI(config)

    // 如果有subjectId，保存到数据库并返回带真实ID的题目
    const savedQuestions: SavedAiQuestion[] = []
    if (subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: String(subjectId) },
      })

      if (!subject) {
        res.status(400).json({
          error: '指定的学科不存在，无法保存题目',
          subjectId,
        })
        return
      }

      // 逐条创建以获取真实ID（不能用 createMany，否则无法返回ID）
      const aiSource = getAiStatus().demoMode ? 'demo' : (process.env.AI_MODEL || 'deepseek')
      // M22: 用 $transaction 包裹整个循环，事务内并行 create（保留 create 以返回真实 ID）
      const createdQuestions = await prisma.$transaction(
        generatedQuestions.map((q) =>
          prisma.question.create({
            data: {
              subjectId: subject.id,
              content: q.content,
              options: JSON.stringify(q.options),
              answer: q.answer,
              difficulty: q.difficulty,
              type: q.type,
              explanation: q.explanation,
              tags: JSON.stringify(q.tags),
              isAiGenerated: true,
              aiSource,
            },
          })
        )
      )
      createdQuestions.forEach((created, index) => {
        const q = generatedQuestions[index]
        savedQuestions.push({
          id: created.id,
          subjectId: subject.id,
          content: q.content,
          options: q.options,
          answer: q.answer,
          difficulty: q.difficulty,
          type: q.type,
          explanation: q.explanation,
          tags: q.tags,
          isAiGenerated: true,
          aiSource: created.aiSource ?? aiSource,
        })
      })
    }

    res.json({
      success: true,
      // 必须返回带真实ID的题目（若已保存），前端不能用临时ID
      questions: savedQuestions.length > 0 ? savedQuestions : generatedQuestions,
      saved: savedQuestions.length > 0,
      savedCount: savedQuestions.length,
      demoMode: getAiStatus().demoMode,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[AI出题路由] 生成失败:', msg)
    res.status(500).json({ error: 'AI出题失败，请稍后重试' })
  }
})

// POST /api/ai-questions/quick-quiz - AI快速出题并直接开始答题
router.post('/quick-quiz', authMiddleware, async (req, res) => {
  try {
    const { subjectName, topic, difficulty, count, questionType } = req.body

    if (!subjectName || !topic) {
      res.status(400).json({ error: '缺少必要参数：subjectName 和 topic' })
      return
    }

    const config: AiQuestionConfig = {
      subjectName: String(subjectName),
      topic: String(topic),
      difficulty: Math.min(5, Math.max(1, Number(difficulty) || 2)),
      count: Math.min(10, Math.max(1, Number(count) || 5)),
      questionType: (questionType as AiQuestionConfig['questionType']) || 'mixed',
    }

    const generatedQuestions = await generateQuestionsByAI(config)

    // 构造前端可直接使用的题目格式（含临时ID）
    const questions = generatedQuestions.map((q, index) => ({
      id: `ai-${Date.now()}-${index}`,
      content: q.content,
      options: q.options,
      answer: q.answer,
      difficulty: q.difficulty,
      type: q.type,
      explanation: q.explanation,
      tags: q.tags,
      isAiGenerated: true,
      aiSource: getAiStatus().demoMode ? 'demo' : (process.env.AI_MODEL || 'deepseek'),
    }))

    res.json({
      success: true,
      questions,
      demoMode: getAiStatus().demoMode,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[AI出题路由] 快速出题失败:', msg)
    res.status(500).json({ error: 'AI出题失败，请稍后重试' })
  }
})

export default router
