// 学习分析路由
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

// 热力图分级规则：根据每日答题数 count 计算 level 0-4
function getHeatmapLevel(count: number): number {
  if (count === 0) return 0
  if (count <= 3) return 1
  if (count <= 6) return 2
  if (count <= 10) return 3
  return 4
}

// 格式化日期为 YYYY-MM-DD
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 获取用户学习分析数据
// GET /overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    // 获取用户基本信息
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 最近7天日期列表
    const today = new Date()
    const weekDates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      weekDates.push(`${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`)
    }
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    // M20: 4 个独立查询并行执行（weeklyRecords / subjectStats / tagStats / allProgressDates）
    // M21: subjectStats 用 raw SQL group by 在数据库聚合（QuizRecord 无 subjectId 字段，无法用 prisma.groupBy 跨表分组）
    const [weeklyRecords, subjectStatsRaw, allTaggedRecords, allProgressDates] = await Promise.all([
      // 最近7天答题趋势
      prisma.quizRecord.findMany({
        where: {
          userId,
          createdAt: { gte: weekStart },
        },
        select: { isCorrect: true, createdAt: true },
      }),
      // 各学科统计（数据库聚合，避免全表扫描内存聚合）
      prisma.$queryRaw<Array<{
        subjectId: string
        subjectName: string
        quizCount: bigint
        correctCount: bigint
      }>>`
        SELECT q."subjectId" AS "subjectId", s.name AS "subjectName",
               COUNT(*) AS "quizCount",
               COUNT(CASE WHEN qr."isCorrect" THEN 1 END) AS "correctCount"
        FROM "QuizRecord" qr
        JOIN "Question" q ON qr."questionId" = q.id
        JOIN "Subject" s ON q."subjectId" = s.id
        WHERE qr."userId" = ${userId}
        GROUP BY q."subjectId", s.name
      `,
      // 薄弱知识点统计（单次查询，避免与 subjectStats 重复扫描）
      prisma.quizRecord.findMany({
        where: { userId },
        include: {
          question: { select: { tags: true } },
        },
      }),
      // 连胜数据
      prisma.dailyProgress.findMany({
        where: { userId, quizCount: { gt: 0 } },
        select: { date: true },
        orderBy: { date: 'desc' },
      }),
    ])

    // 按日期分组统计
    const dailyStatsMap: Record<string, { quizCount: number; correctCount: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
      dailyStatsMap[key] = { quizCount: 0, correctCount: 0 }
    }

    weeklyRecords.forEach((r) => {
      const d = new Date(r.createdAt)
      const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
      if (dailyStatsMap[key]) {
        dailyStatsMap[key].quizCount++
        if (r.isCorrect) dailyStatsMap[key].correctCount++
      }
    })

    const weeklyTrend = weekDates.map((date) => {
      const stat = dailyStatsMap[date] || { quizCount: 0, correctCount: 0 }
      return {
        date,
        quizCount: stat.quizCount,
        correctCount: stat.correctCount,
        accuracy: stat.quizCount > 0 ? Math.round((stat.correctCount / stat.quizCount) * 100) : 0,
      }
    })

    // 各学科统计（从数据库聚合结果转换 bigint 为 number）
    const subjectStatsList = subjectStatsRaw.map((r) => {
      const quizCount = Number(r.quizCount)
      const correctCount = Number(r.correctCount)
      return {
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        quizCount,
        correctCount,
        accuracy: quizCount > 0 ? Math.round((correctCount / quizCount) * 100) : 0,
      }
    })

    // 薄弱知识点（基于答题记录的 tags 统计）
    const tagStats: Record<string, { wrongCount: number; totalCount: number }> = {}
    allTaggedRecords.forEach((r) => {
      const q = r.question
      if (!q.tags) return
      try {
        const tags: string[] = JSON.parse(q.tags)
        tags.forEach((tag) => {
          if (!tagStats[tag]) tagStats[tag] = { wrongCount: 0, totalCount: 0 }
          tagStats[tag].totalCount++
          if (!r.isCorrect) tagStats[tag].wrongCount++
        })
      } catch { /* ignore */ }
    })

    const weakPoints = Object.entries(tagStats)
      .filter(([, data]) => data.wrongCount > 0)
      .map(([tag, data]) => ({
        tag,
        wrongCount: data.wrongCount,
        totalCount: data.totalCount,
        masteryRate: data.totalCount > 0 ? Math.round(((data.totalCount - data.wrongCount) / data.totalCount) * 100) : 0,
      }))
      .sort((a, b) => a.masteryRate - b.masteryRate)
      .slice(0, 10)

    // 连胜数据（maxStreak 查询 DailyProgress 计算真实最长连续）
    let maxStreak = 0
    let tempStreak = 0
    let prevTime: number | null = null
    for (const p of allProgressDates) {
      const t = new Date(p.date).getTime()
      if (prevTime !== null) {
        const diffDays = Math.round((prevTime - t) / 86400000)
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1
      } else {
        tempStreak = 1
      }
      if (tempStreak > maxStreak) maxStreak = tempStreak
      prevTime = t
    }

    const streakData = {
      currentStreak: user.streakDays,
      maxStreak,
      weeklyStreakDays: weeklyTrend.filter((d) => d.quizCount > 0).length,
    }

    // 本周学习天数（从 DailyProgress 获取，或从答题记录推算）
    const weekDateString = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      weekDateString.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }

    res.json({
      totalQuiz: user.totalQuiz,
      totalCorrect: user.totalCorrect,
      accuracyRate: user.totalQuiz > 0 ? Math.round((user.totalCorrect / user.totalQuiz) * 100) : 0,
      weeklyTrend,
      subjectStats: subjectStatsList,
      weakPoints,
      streakData,
    })
  } catch (error) {
    console.error('获取学习分析失败:', error)
    res.status(500).json({ error: '获取学习分析失败' })
  }
})

// 获取学习热力图数据（最近365天）
// GET /heatmap
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    // 计算365天前的日期
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 364)
    startDate.setHours(0, 0, 0, 0)

    // 一次性获取365天内的所有进度记录
    const progressRecords = await prisma.dailyProgress.findMany({
      where: {
        userId,
        date: { gte: formatDate(startDate) },
      },
      select: { date: true, quizCount: true },
      orderBy: { date: 'asc' },
    })

    // 构建 date -> count 映射
    const countMap: Record<string, number> = {}
    let totalQuestions = 0
    for (const r of progressRecords) {
      countMap[r.date] = r.quizCount
      totalQuestions += r.quizCount
    }

    // 生成365天的完整热力图数据（含没有记录的日期，level=0）
    const heatmapData: Array<{ date: string; count: number; level: number }> = []
    let totalDays = 0
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dateStr = formatDate(d)
      const count = countMap[dateStr] || 0
      if (count > 0) totalDays++
      heatmapData.push({ date: dateStr, count, level: getHeatmapLevel(count) })
    }

    // 计算连续学习天数（基于已有日期记录）
    const sortedDates = Object.keys(countMap)
      .filter((d) => countMap[d] > 0)
      .sort()

    let longestStreak = 0
    let currentStreak = 0
    let prevDate: Date | null = null

    for (const dateStr of sortedDates) {
      const cur = new Date(dateStr)
      if (prevDate) {
        const diff = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) {
          currentStreak++
        } else if (diff === 0) {
          // 同一天，跳过
          continue
        } else {
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      longestStreak = Math.max(longestStreak, currentStreak)
      prevDate = cur
    }

    // 计算当前连续天数（从今天往前推算）
    let currentActiveStreak = 0
    const todayStr = formatDate(new Date())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = formatDate(yesterday)

    // 如果今天或昨天有答题，开始计算连续
    if (countMap[todayStr] > 0 || countMap[yesterdayStr] > 0) {
      const checkDate = countMap[todayStr] > 0 ? new Date() : yesterday
      const checkStr = formatDate(checkDate)
      let cursor = new Date(checkStr)
      while (countMap[formatDate(cursor)] > 0) {
        currentActiveStreak++
        cursor.setDate(cursor.getDate() - 1)
      }
    }

    const averagePerDay = totalDays > 0 ? Math.round((totalQuestions / totalDays) * 10) / 10 : 0

    res.json({
      heatmapData,
      stats: {
        totalDays,
        longestStreak,
        currentStreak: currentActiveStreak,
        totalQuestions,
        averagePerDay,
      },
    })
  } catch (error) {
    console.error('获取热力图失败:', error)
    res.status(500).json({ error: '获取热力图数据失败' })
  }
})

// 获取连续学习天数详情
// GET /streak
router.get('/streak', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    // 获取所有有答题记录的日期
    const progressRecords = await prisma.dailyProgress.findMany({
      where: { userId, quizCount: { gt: 0 } },
      select: { date: true, quizCount: true },
      orderBy: { date: 'asc' },
    })

    const streakHistory = progressRecords.map((r) => ({ date: r.date, count: r.quizCount }))

    // 计算最长连续天数
    let longestStreak = 0
    let currentStreak = 0
    let prevDate: Date | null = null

    for (const r of streakHistory) {
      const cur = new Date(r.date)
      if (prevDate) {
        const diff = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) {
          currentStreak++
        } else if (diff === 0) {
          continue
        } else {
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      longestStreak = Math.max(longestStreak, currentStreak)
      prevDate = cur
    }

    // 当前连续天数
    let currentActiveStreak = 0
    const todayStr = formatDate(new Date())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = formatDate(yesterday)

    const countMap: Record<string, number> = {}
    for (const r of streakHistory) countMap[r.date] = r.count

    if (countMap[todayStr] > 0 || countMap[yesterdayStr] > 0) {
      const checkDate = countMap[todayStr] > 0 ? new Date() : yesterday
      const checkStr = formatDate(checkDate)
      let cursor = new Date(checkStr)
      while (countMap[formatDate(cursor)] > 0) {
        currentActiveStreak++
        cursor.setDate(cursor.getDate() - 1)
      }
    }

    res.json({
      currentStreak: currentActiveStreak,
      longestStreak,
      streakHistory,
    })
  } catch (error) {
    console.error('获取连续学习天数失败:', error)
    res.status(500).json({ error: '获取连续学习天数失败' })
  }
})

export default router
