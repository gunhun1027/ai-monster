// 学习计划路由
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

// 获取学习计划
// GET /
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    let plan = await prisma.studyPlan.findUnique({ where: { userId } })
    if (!plan) {
      // 自动创建默认计划
      plan = await prisma.studyPlan.create({
        data: { userId, dailyGoal: 10, dailyTimeGoal: 15, reminderEnabled: false },
      })
    }
    res.json({
      dailyGoal: plan.dailyGoal,
      dailyTimeGoal: plan.dailyTimeGoal,
      reminderTime: plan.reminderTime,
      reminderEnabled: plan.reminderEnabled,
    })
  } catch (error) {
    console.error('获取学习计划失败:', error)
    res.status(500).json({ error: '获取学习计划失败' })
  }
})

// 更新学习计划
// PUT /
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { dailyGoal, dailyTimeGoal, reminderTime, reminderEnabled } = req.body

    if (dailyGoal !== undefined) {
      if (typeof dailyGoal !== 'number' || !Number.isFinite(dailyGoal)) {
        return res.status(400).json({ error: 'dailyGoal 必须为数字' })
      }
    }
    if (dailyTimeGoal !== undefined) {
      if (typeof dailyTimeGoal !== 'number' || !Number.isFinite(dailyTimeGoal)) {
        return res.status(400).json({ error: 'dailyTimeGoal 必须为数字' })
      }
    }

    const plan = await prisma.studyPlan.upsert({
      where: { userId },
      update: {
        ...(dailyGoal !== undefined && { dailyGoal: Math.max(1, Math.min(100, dailyGoal)) }),
        ...(dailyTimeGoal !== undefined && { dailyTimeGoal: Math.max(1, Math.min(120, dailyTimeGoal)) }),
        ...(reminderTime !== undefined && { reminderTime }),
        ...(reminderEnabled !== undefined && { reminderEnabled }),
      },
      create: {
        userId,
        dailyGoal: dailyGoal || 10,
        dailyTimeGoal: dailyTimeGoal || 15,
        reminderTime: reminderTime || null,
        reminderEnabled: reminderEnabled || false,
      },
    })

    res.json({
      dailyGoal: plan.dailyGoal,
      dailyTimeGoal: plan.dailyTimeGoal,
      reminderTime: plan.reminderTime,
      reminderEnabled: plan.reminderEnabled,
    })
  } catch (error) {
    console.error('更新学习计划失败:', error)
    res.status(500).json({ error: '更新学习计划失败' })
  }
})

// 获取今日进度
// GET /today
router.get('/today', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 获取或创建今日进度
    let progress = await prisma.dailyProgress.findUnique({
      where: { userId_date: { userId, date: todayStr } },
    })

    if (!progress) {
      progress = await prisma.dailyProgress.create({
        data: { userId, date: todayStr },
      })
    }

    // 获取学习计划
    let plan = await prisma.studyPlan.findUnique({ where: { userId } })
    if (!plan) {
      plan = await prisma.studyPlan.create({
        data: { userId, dailyGoal: 10, dailyTimeGoal: 15, reminderEnabled: false },
      })
    }

    const progressPercent = Math.min(100, Math.round((progress.quizCount / plan.dailyGoal) * 100))

    res.json({
      quizCount: progress.quizCount,
      correctCount: progress.correctCount,
      studyMinutes: progress.studyMinutes,
      goalAchieved: progress.goalAchieved,
      dailyGoal: plan.dailyGoal,
      dailyTimeGoal: plan.dailyTimeGoal,
      progressPercent,
    })
  } catch (error) {
    console.error('获取今日进度失败:', error)
    res.status(500).json({ error: '获取今日进度失败' })
  }
})

// 获取本周进度日历
// GET /weekly
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 构造本周7天的日期字符串
    const weekDates: { dateStr: string; shortDate: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      weekDates.push({
        dateStr,
        shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
      })
    }

    // 单次查询所有7天的进度（避免N+1查询）
    const progressList = await prisma.dailyProgress.findMany({
      where: {
        userId,
        date: { in: weekDates.map(w => w.dateStr) },
      },
    })
    const progressByDate = new Map(progressList.map(p => [p.date, p]))

    const days = weekDates.map(({ dateStr, shortDate }) => {
      const progress = progressByDate.get(dateStr)
      return {
        date: shortDate,
        fullDate: dateStr,
        quizCount: progress?.quizCount || 0,
        goalAchieved: progress?.goalAchieved || false,
        isToday: dateStr === todayStr,
      }
    })

    res.json({ days })
  } catch (error) {
    console.error('获取本周进度失败:', error)
    res.status(500).json({ error: '获取本周进度失败' })
  }
})

export default router
