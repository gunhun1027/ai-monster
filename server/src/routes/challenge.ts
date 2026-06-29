// 挑战模式路由 - 速答、Boss、生存模式
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 内存存储已发放的 challengeId（防重复提交；进程重启清空可接受）
const activeChallenges = new Map<string, { userId: string; challengeType: string; startedAt: number }>()
const CHALLENGE_TTL_MS = 60 * 60 * 1000 // 1 小时过期

// 挑战模式配置
const CHALLENGE_CONFIGS = {
  speed: {
    name: '速答模式',
    description: '60秒内答尽可能多的题',
    type: 'speed',
    difficulty: 2,
    rewardCoins: 30,
    rewardExp: 50,
    icon: '⚡',
    timeLimit: 60,
    perQuestionTime: 5,
  },
  boss: {
    name: 'Boss挑战',
    description: '连续答对10题击败Boss',
    type: 'boss',
    difficulty: 3,
    rewardCoins: 50,
    rewardExp: 80,
    icon: '👹',
    timeLimit: 0,
    perQuestionTime: 15,
  },
  survival: {
    name: '生存模式',
    description: '答对继续，答错结束',
    type: 'survival',
    difficulty: 2,
    rewardCoins: 20,
    rewardExp: 30,
    icon: '🏃',
    timeLimit: 0,
    perQuestionTime: 10,
  },
}

// 获取挑战模式列表
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // 获取用户在各模式的最佳记录
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { username: true },
    })

    const challenges = Object.entries(CHALLENGE_CONFIGS).map(([key, config]) => ({
      id: key,
      ...config,
    }))

    res.json({
      success: true,
      data: { challenges },
    })
  } catch (error) {
    console.error('获取挑战列表失败:', error)
    res.status(500).json({ error: '获取挑战列表失败' })
  }
})

// 开始挑战
router.post('/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { challengeType, subjectId } = req.body
    if (!['speed', 'boss', 'survival'].includes(challengeType)) {
      return res.status(400).json({ error: '无效的挑战类型' })
    }

    const config = CHALLENGE_CONFIGS[challengeType as keyof typeof CHALLENGE_CONFIGS]

    // 获取题目 - 更多题目以备挑战
    const questionCount = challengeType === 'speed' ? 50 : challengeType === 'boss' ? 15 : 30

    let questions: Array<{ id: string; content: string; options: string; answer: string; difficulty: number; subjectId: string; type: string | null }> = []

    if (subjectId) {
      questions = await prisma.$queryRaw`
        SELECT id, content, options, answer, difficulty, "subjectId", type
        FROM "Question"
        WHERE "isActive" = true AND "subjectId" = ${subjectId}
        ORDER BY RANDOM()
        LIMIT ${questionCount}
      `
    } else {
      questions = await prisma.$queryRaw`
        SELECT id, content, options, answer, difficulty, "subjectId", type
        FROM "Question"
        WHERE "isActive" = true
        ORDER BY RANDOM()
        LIMIT ${questionCount}
      `
    }

    if (questions.length === 0) {
      return res.status(404).json({ error: '暂无题目可供挑战' })
    }

    const challengeId = `challenge_${Date.now()}_${req.userId}_${Math.random().toString(36).slice(2, 8)}`
    activeChallenges.set(challengeId, { userId: req.userId!, challengeType, startedAt: Date.now() })

    res.json({
      success: true,
      data: {
        challengeId,
        questions: questions.map(q => ({
          id: q.id,
          content: q.content,
          options: JSON.parse(q.options),
          answer: q.answer,
          difficulty: q.difficulty,
          subjectId: q.subjectId,
          type: q.type || 'choice',
        })),
        timeLimit: config.timeLimit,
        perQuestionTime: config.perQuestionTime,
        config,
      },
    })
  } catch (error) {
    console.error('开始挑战失败:', error)
    res.status(500).json({ error: '开始挑战失败' })
  }
})

// 提交挑战结果
router.post('/:id/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { answers, challengeType } = req.body as {
      answers?: Array<{ questionId: string; selectedOption?: number; timeTaken?: number; fillblankAnswer?: string }>
      challengeType?: string
    }
    const userId = req.userId!
    const challengeId = req.params.id

    const config = CHALLENGE_CONFIGS[challengeType as keyof typeof CHALLENGE_CONFIGS]
    if (!config) {
      return res.status(400).json({ error: '无效的挑战类型' })
    }

    // C1 防重复提交：校验 challengeId 有效且未被使用
    const challengeInfo = activeChallenges.get(challengeId)
    if (!challengeInfo) {
      return res.status(400).json({ error: '挑战不存在或已过期，请重新开始' })
    }
    if (challengeInfo.userId !== userId) {
      return res.status(403).json({ error: '无权提交他人的挑战' })
    }
    if (Date.now() - challengeInfo.startedAt > CHALLENGE_TTL_MS) {
      activeChallenges.delete(challengeId)
      return res.status(400).json({ error: '挑战已超时，请重新开始' })
    }
    // 原子性标记为已使用（删除防止二次提交）
    activeChallenges.delete(challengeId)

    // 服务端重新校验答案（禁止信任客户端 isCorrect/score）
    const answerList = Array.isArray(answers) ? answers : []
    // M14: 对 questionId 去重，防止刷 totalQuiz
    const seenQuestionIds = new Set<string>()
    const dedupedAnswers = answerList.filter((a) => {
      if (!a.questionId || seenQuestionIds.has(a.questionId)) return false
      seenQuestionIds.add(a.questionId)
      return true
    })
    const questionIds = [...seenQuestionIds]
    const questionsFromDb = questionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, answer: true, subjectId: true, content: true, options: true, type: true },
        })
      : []
    const questionMap = new Map(questionsFromDb.map((q) => [q.id, q]))

    let correctCount = 0
    const verifiedAnswers = dedupedAnswers.map((a) => {
      const q = questionMap.get(a.questionId)
      // M13: 根据 type 区分选择题和填空题
      let isCorrect = false
      if (q) {
        if (q.type === 'fillblank') {
          // 填空题：文本比较（忽略首尾空格和大小写）
          const expected = String(q.answer || '').trim().toLowerCase()
          const actual = String(a.fillblankAnswer || '').trim().toLowerCase()
          isCorrect = expected.length > 0 && expected === actual
        } else {
          // 选择题：索引比较
          isCorrect = a.selectedOption !== undefined && a.selectedOption === parseInt(q.answer)
        }
      }
      if (isCorrect) correctCount++
      return {
        questionId: a.questionId,
        isCorrect,
        selectedOption: a.selectedOption ?? -1,
        timeTaken: Math.max(0, Math.min(a.timeTaken ?? 0, 3600)),
        subjectId: q?.subjectId || '',
        content: q?.content || '',
        options: q?.options || '[]',
        correctAnswer: q ? parseInt(q.answer) || 0 : 0,
      }
    })

    // 服务端重算 score（基于实际答对数）
    const score = correctCount

    // 计算奖励
    let rewardCoins = 0
    let rewardExp = 0

    if (challengeType === 'speed') {
      rewardCoins = Math.floor(score * 3)
      rewardExp = Math.floor(score * 5)
    } else if (challengeType === 'boss') {
      rewardCoins = score >= 10 ? 50 : Math.floor(score * 3)
      rewardExp = score >= 10 ? 80 : Math.floor(score * 5)
    } else if (challengeType === 'survival') {
      rewardCoins = Math.floor(score * 2)
      rewardExp = Math.floor(score * 3)
    }

    // 获取用户当前数据
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 处理经验与升级
    const { processLevelUp } = require('../utils/evolution')
    const levelUpResult = processLevelUp(user.monsterLevel, user.monsterExp, user.monsterMaxExp, rewardExp)

    // M3: 关键写操作（user 更新 + 答题记录）用 $transaction 批量形式保证原子性
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          coins: { increment: rewardCoins },
          monsterLevel: levelUpResult.newLevel,
          monsterExp: levelUpResult.newExp,
          monsterMaxExp: levelUpResult.newMaxExp,
          monsterStage: levelUpResult.newStage,
          totalQuiz: { increment: verifiedAnswers.length },
          totalCorrect: { increment: correctCount },
        },
        select: { coins: true, monsterLevel: true, monsterExp: true, monsterMaxExp: true, monsterStage: true },
      }),
      // 批量创建答题记录
      ...(verifiedAnswers.length > 0
        ? [prisma.quizRecord.createMany({
            data: verifiedAnswers.map((ans) => ({
              userId,
              questionId: ans.questionId,
              isCorrect: ans.isCorrect,
              timeTaken: ans.timeTaken,
              expGained: ans.isCorrect ? 10 : 0,
              comboAtTime: 0,
            })),
          })]
        : []),
    ])

    // 记录错题（非关键，fire-and-forget 但保留错误日志）
    for (const ans of verifiedAnswers) {
      if (!ans.isCorrect && ans.subjectId) {
        prisma.wrongAnswer.upsert({
          where: { userId_questionId: { userId, questionId: ans.questionId } },
          update: { wrongCount: { increment: 1 }, lastWrongAt: new Date(), selectedOption: ans.selectedOption },
          create: {
            userId,
            questionId: ans.questionId,
            subjectId: ans.subjectId,
            selectedOption: ans.selectedOption,
            correctAnswer: ans.correctAnswer,
            content: ans.content,
            options: ans.options,
            wrongCount: 1,
          },
        }).catch((err: unknown) => {
          console.error('[Challenge] 记录错题失败:', err instanceof Error ? err.message : err)
        })
      } else if (ans.isCorrect) {
        prisma.wrongAnswer.updateMany({
          where: { userId, questionId: ans.questionId, mastered: false },
          data: { mastered: true },
        }).catch((err: unknown) => {
          console.error('[Challenge] 标记已掌握失败:', err instanceof Error ? err.message : err)
        })
      }
    }

    res.json({
      success: true,
      data: {
        score,
        rewardCoins,
        rewardExp,
        newCoins: updatedUser.coins,
        levelUp: levelUpResult.isLevelUp ? { newLevel: levelUpResult.newLevel } : null,
        evolution: levelUpResult.isEvolved ? { newStage: levelUpResult.newStage } : null,
      },
    })
  } catch (error) {
    console.error('提交挑战结果失败:', error)
    res.status(500).json({ error: '提交挑战结果失败' })
  }
})

// 获取排行榜
router.get('/leaderboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string || 'speed'

    // 简单实现 - 返回空列表，排行榜可后续扩展
    res.json({
      success: true,
      data: { items: [] },
    })
  } catch (error) {
    console.error('获取排行榜失败:', error)
    res.status(500).json({ error: '获取排行榜失败' })
  }
})

export default router
