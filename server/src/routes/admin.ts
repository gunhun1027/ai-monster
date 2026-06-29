// 管理后台路由
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { adminMiddleware } from '../middleware/auth'

const router = Router()

// 所有路由都需要管理员权限
router.use(adminMiddleware)

// ===== 数据统计 =====
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalUsers, todayActiveUsers, totalQuestions, totalQuizRecords, todayNewUsers, subjects] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }),
      prisma.user.count({
        where: {
          role: 'user',
          lastQuizDate: { gte: today },
        },
      }),
      prisma.question.count({ where: { isActive: true } }),
      prisma.quizRecord.count(),
      prisma.user.count({
        where: {
          role: 'user',
          createdAt: { gte: today },
        },
      }),
      prisma.subject.findMany({
        include: {
          _count: { select: { questions: { where: { isActive: true } } } },
        },
      }),
    ])

    res.json({
      stats: {
        totalUsers,
        todayActiveUsers,
        totalQuestions,
        totalQuizRecords,
        todayNewUsers,
        subjectDistribution: subjects.map((s) => ({
          name: s.name,
          icon: s.icon,
          count: s._count.questions,
        })),
      },
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    res.status(500).json({ error: '获取统计数据失败' })
  }
})

// ===== 用户管理 =====
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const search = req.query.search as string

    const where: Prisma.UserWhereInput = { role: 'user' }
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatarUrl: true,
          monsterName: true,
          monsterStage: true,
          monsterLevel: true,
          streakDays: true,
          totalCorrect: true,
          totalQuiz: true,
          maxCombo: true,
          createdAt: true,
          lastQuizDate: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({ error: '获取用户列表失败' })
  }
})

// 用户详情
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        monsterName: true,
        monsterStage: true,
        monsterLevel: true,
        monsterExp: true,
        monsterMaxExp: true,
        streakDays: true,
        totalCorrect: true,
        totalQuiz: true,
        combo: true,
        maxCombo: true,
        lastQuizDate: true,
        createdAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ user })
  } catch (error) {
    console.error('获取用户详情失败:', error)
    res.status(500).json({ error: '获取用户详情失败' })
  }
})

// 修改用户
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { role, monsterLevel, monsterExp, streakDays, totalCorrect } = req.body as {
      role?: string
      monsterLevel?: number
      monsterExp?: number
      streakDays?: number
      totalCorrect?: number
    }

    // 校验 role 白名单，防止越权提升
    if (role !== undefined && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: '无效的角色类型' })
    }

    // 构造更新数据，仅更新提供的字段，数字字段 clamp 范围
    const data: Prisma.UserUpdateInput = {}
    if (role !== undefined) data.role = role
    if (monsterLevel !== undefined) data.monsterLevel = Math.max(1, Math.min(monsterLevel, 9999))
    if (monsterExp !== undefined) data.monsterExp = Math.max(0, Math.min(monsterExp, 9999999))
    if (streakDays !== undefined) data.streakDays = Math.max(0, Math.min(streakDays, 9999))
    if (totalCorrect !== undefined) data.totalCorrect = Math.max(0, Math.min(totalCorrect, 9999999))

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, username: true, role: true },
    })
    res.json({ user })
  } catch (error) {
    console.error('修改用户失败:', error)
    res.status(500).json({ error: '修改用户失败' })
  }
})

// ===== 题目管理 =====
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const subjectId = req.query.subjectId as string

    const where: Prisma.QuestionWhereInput = {}
    if (subjectId) where.subjectId = subjectId

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          subject: { select: { name: true, icon: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.question.count({ where }),
    ])

    res.json({
      questions: questions.map((q) => ({
        id: q.id,
        content: q.content,
        options: JSON.parse(q.options),
        answer: parseInt(q.answer) || 0,
        difficulty: q.difficulty,
        isActive: q.isActive,
        subjectId: q.subjectId,
        type: q.type || 'choice',
        explanation: q.explanation || null,
        tags: q.tags ? JSON.parse(q.tags) : null,
        subject: q.subject,
        createdAt: q.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('获取题目列表失败:', error)
    res.status(500).json({ error: '获取题目列表失败' })
  }
})

// 添加题目
router.post('/questions', async (req: Request, res: Response) => {
  try {
    const { subjectId, content, options, answer, difficulty, type, explanation, tags } = req.body

    if (!subjectId || !content || !options || answer === undefined) {
      return res.status(400).json({ error: '参数不完整' })
    }

    // 校验 subjectId 是否对应存在的学科
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!subject) {
      return res.status(400).json({ error: '无效的学科ID' })
    }

    const question = await prisma.question.create({
      data: {
        subjectId,
        content,
        options: JSON.stringify(options),
        answer: String(answer),
        difficulty: difficulty || 1,
        type: type || 'choice',
        explanation: explanation || null,
        tags: tags ? JSON.stringify(tags) : null,
      },
    })

    res.status(201).json({ question })
  } catch (error) {
    console.error('添加题目失败:', error)
    res.status(500).json({ error: '添加题目失败' })
  }
})

// 修改题目
router.put('/questions/:id', async (req: Request, res: Response) => {
  try {
    const { content, options, answer, difficulty, isActive, subjectId, type, explanation, tags } = req.body

    // 校验 subjectId 是否对应存在的学科
    if (subjectId !== undefined) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
      if (!subject) {
        return res.status(400).json({ error: '无效的学科ID' })
      }
    }

    // 校验 type 白名单
    if (type !== undefined && !['choice', 'fillblank'].includes(type)) {
      return res.status(400).json({ error: '无效的题目类型' })
    }

    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: {
        content,
        options: options ? JSON.stringify(options) : undefined,
        answer: answer !== undefined ? String(answer) : undefined,
        difficulty: difficulty !== undefined ? Math.max(1, Math.min(5, difficulty)) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        subjectId,
        type,
        explanation,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    })
    res.json({ question })
  } catch (error) {
    console.error('修改题目失败:', error)
    res.status(500).json({ error: '修改题目失败' })
  }
})

// 删除题目
router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    console.error('删除题目失败:', error)
    res.status(500).json({ error: '删除题目失败' })
  }
})

// ===== 学科管理 =====
router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json({
      subjects: subjects.map((s) => ({
        ...s,
        questionCount: s._count.questions,
      })),
    })
  } catch (error) {
    console.error('获取学科列表失败:', error)
    res.status(500).json({ error: '获取学科列表失败' })
  }
})

router.post('/subjects', async (req: Request, res: Response) => {
  try {
    const { name, description, icon } = req.body
    const subject = await prisma.subject.create({
      data: { name, description, icon: icon || '📚' },
    })
    res.status(201).json({ subject })
  } catch (error) {
    console.error('添加学科失败:', error)
    res.status(500).json({ error: '添加学科失败' })
  }
})

router.put('/subjects/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, icon, isActive } = req.body
    const subject = await prisma.subject.update({
      where: { id: req.params.id },
      data: { name, description, icon, isActive },
    })
    res.json({ subject })
  } catch (error) {
    console.error('修改学科失败:', error)
    res.status(500).json({ error: '修改学科失败' })
  }
})

export default router
