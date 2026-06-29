// 每日奖励路由
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 7天奖励规则（coins 统一表示基础金币数，bonus 表示额外奖励）
const REWARD_RULES: Record<number, { coins: number; bonusType: 'none' | 'food_apple' | 'food_fish' | 'exp_boost'; bonusLabel: string; label: string }> = {
  1: { coins: 10, bonusType: 'none', bonusLabel: '', label: '10 金币' },
  2: { coins: 20, bonusType: 'none', bonusLabel: '', label: '20 金币' },
  3: { coins: 30, bonusType: 'food_apple', bonusLabel: '🍎 苹果×1', label: '30 金币 + 🍎' },
  4: { coins: 40, bonusType: 'none', bonusLabel: '', label: '40 金币' },
  5: { coins: 50, bonusType: 'none', bonusLabel: '', label: '50 金币' },
  6: { coins: 60, bonusType: 'food_fish', bonusLabel: '🐟 鱼×1', label: '60 金币 + 🐟' },
  7: { coins: 100, bonusType: 'exp_boost', bonusLabel: '⚡ 2h经验加成', label: '100 金币 + ⚡' },
}

// 获取今日奖励状态
router.get('/daily', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 计算最近7天的日期
    const last7Days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      last7Days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }

    // 批量查询最近7天的签到记录
    const recentRewards = await prisma.dailyReward.findMany({
      where: { userId, date: { in: last7Days } },
      orderBy: { date: 'asc' },
    })

    // 构建签到历史 map
    const rewardMap = new Map(recentRewards.map(r => [r.date, r]))

    // 查找今日记录
    const todayReward = rewardMap.get(today)

    if (todayReward) {
      // 构建历史记录
      const weekHistory = last7Days.map(date => {
        const r = rewardMap.get(date)
        return {
          date,
          claimed: r?.claimed || false,
          dayStreak: r?.dayStreak || 0,
        }
      })

      return res.json({
        todayReward: {
          dayStreak: todayReward.dayStreak,
          rewardType: todayReward.rewardType,
          rewardValue: todayReward.rewardValue,
          claimed: todayReward.claimed,
        },
        canClaim: !todayReward.claimed,
        weekHistory,
      })
    }

    // 计算连续签到天数
    let dayStreak = 1
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    const yesterdayReward = rewardMap.get(yesterdayStr)
    if (yesterdayReward) {
      dayStreak = yesterdayReward.dayStreak >= 7 ? 1 : yesterdayReward.dayStreak + 1
    }
    // 如果昨天没有签到记录，dayStreak 保持 1（断签重置）

    const rule = REWARD_RULES[dayStreak as keyof typeof REWARD_RULES] || REWARD_RULES[1]

    // 创建今日奖励记录
    const reward = await prisma.dailyReward.create({
      data: {
        userId,
        date: today,
        claimed: false,
        rewardType: rule.bonusType === 'none' ? 'coins' : rule.bonusType,
        rewardValue: rule.coins,
        dayStreak,
      },
    })

    // 构建历史记录（含刚创建的今日记录）
    const weekHistory = last7Days.map(date => {
      if (date === today) {
        return { date, claimed: false, dayStreak: reward.dayStreak }
      }
      const r = rewardMap.get(date)
      return {
        date,
        claimed: r?.claimed || false,
        dayStreak: r?.dayStreak || 0,
      }
    })

    res.json({
      todayReward: {
        dayStreak: reward.dayStreak,
        rewardType: reward.rewardType,
        rewardValue: reward.rewardValue,
        claimed: false,
      },
      canClaim: true,
      weekHistory,
    })
  } catch (error) {
    console.error('获取每日奖励状态失败:', error)
    res.status(500).json({ error: '获取每日奖励状态失败' })
  }
})

// 领取今日奖励
router.post('/daily/claim', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 原子性领取：只有 claimed=false 才能更新为 true，防止 TOCTOU 并发重复领取
    const claimResult = await prisma.dailyReward.updateMany({
      where: { userId, date: today, claimed: false },
      data: { claimed: true },
    })

    if (claimResult.count === 0) {
      // 判断是已领取还是记录不存在
      const existing = await prisma.dailyReward.findUnique({
        where: { userId_date: { userId, date: today } },
      })
      if (existing) {
        return res.status(400).json({ error: '今日奖励已领取' })
      }
      return res.status(400).json({ error: '今日奖励尚未生成，请刷新页面' })
    }

    // 重新获取记录信息（含 dayStreak）
    const todayReward = await prisma.dailyReward.findUnique({
      where: { userId_date: { userId, date: today } },
    })
    if (!todayReward) {
      return res.status(500).json({ error: '领取失败，请重试' })
    }

    const rule = REWARD_RULES[todayReward.dayStreak as keyof typeof REWARD_RULES] || REWARD_RULES[1]
    const coinsToAdd = rule.coins
    let message = `获得 ${coinsToAdd} 金币`

    // 用事务发放奖励（金币 + 道具/加成），保证原子性
    const updatedUser = await prisma.$transaction(async (tx) => {
      let bonusItemId: string | null = null
      if (rule.bonusType === 'food_apple') {
        const appleItem = await tx.item.findFirst({ where: { effect: 'hunger+30' } })
        bonusItemId = appleItem?.id || null
        if (bonusItemId) message += ' + 🍎 苹果×1'
      } else if (rule.bonusType === 'food_fish') {
        const fishItem = await tx.item.findFirst({ where: { effect: 'hunger+50,happiness+5' } })
        bonusItemId = fishItem?.id || null
        if (bonusItemId) message += ' + 🐟 鱼×1'
      } else if (rule.bonusType === 'exp_boost') {
        message += ' + ⚡ 2小时经验加成'
      }

      let pathPoints: Prisma.InputJsonValue | undefined
      if (rule.bonusType === 'exp_boost') {
        const boostEnd = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2小时后
        const freshUser = await tx.user.findUnique({ where: { id: userId }, select: { pathPoints: true } })
        pathPoints = { ...((freshUser?.pathPoints || {}) as Record<string, unknown>), expBoostUntil: boostEnd.toISOString() } as Prisma.InputJsonValue
      }

      const u = await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: coinsToAdd },
          ...(pathPoints ? { pathPoints } : {}),
        },
        select: { coins: true },
      })

      if (bonusItemId) {
        await tx.userItem.upsert({
          where: { userId_itemId: { userId, itemId: bonusItemId } },
          update: { quantity: { increment: 1 } },
          create: { userId, itemId: bonusItemId, quantity: 1 },
        })
      }

      return u
    })

    res.json({
      success: true,
      reward: {
        type: todayReward.rewardType,
        value: todayReward.rewardValue,
        coins: coinsToAdd,
        bonusType: rule.bonusType,
      },
      newCoins: updatedUser.coins,
      newDayStreak: todayReward.dayStreak,
      message,
    })
  } catch (error) {
    console.error('领取每日奖励失败:', error)
    res.status(500).json({ error: '领取每日奖励失败' })
  }
})

export default router
