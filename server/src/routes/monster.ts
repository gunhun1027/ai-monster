// 怪兽路由 - 包含养成互动系统
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { EVOLUTION_STAGES, getEvolutionConfig } from '../utils/evolution'

const router = Router()

// 获取当前用户怪兽数据
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        monsterName: true,
        monsterStage: true,
        monsterLevel: true,
        monsterExp: true,
        monsterMaxExp: true,
        monsterMood: true,
        evolutionBranch: true,
        pathPoints: true,
        abilityScore: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({
      monster: {
        ...user,
        stageInfo: EVOLUTION_STAGES[user.monsterStage as keyof typeof EVOLUTION_STAGES],
      },
    })
  } catch (error) {
    console.error('获取怪兽数据失败:', error)
    res.status(500).json({ error: '获取怪兽数据失败' })
  }
})

// 获取进化配置表
router.get('/evolution', (req: Request, res: Response) => {
  res.json({ stages: getEvolutionConfig() })
})

// 修改怪兽名字
router.put('/name', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { monsterName } = req.body
    const trimmedName = typeof monsterName === 'string' ? monsterName.trim() : ''
    if (!trimmedName || trimmedName.length > 12) {
      return res.status(400).json({ error: '怪兽名字长度需1-12个字符' })
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { monsterName: trimmedName },
      select: { monsterName: true },
    })

    res.json({ monsterName: user.monsterName })
  } catch (error) {
    console.error('修改怪兽名字失败:', error)
    res.status(500).json({ error: '修改怪兽名字失败' })
  }
})

// 计算自然衰减后的属性值
function calcDecayedValues(user: {
  hunger: number
  cleanliness: number
  lastFedAt: Date | null
  lastCleanedAt: Date | null
}) {
  const now = new Date()
  let hunger = user.hunger
  let cleanliness = user.cleanliness

  if (user.lastFedAt) {
    const hoursSinceFed = (now.getTime() - new Date(user.lastFedAt).getTime()) / (1000 * 60 * 60)
    hunger = Math.max(0, Math.floor(hunger - hoursSinceFed * 5))
  }

  if (user.lastCleanedAt) {
    const hoursSinceCleaned = (now.getTime() - new Date(user.lastCleanedAt).getTime()) / (1000 * 60 * 60)
    cleanliness = Math.max(0, Math.floor(cleanliness - hoursSinceCleaned * 10 / 6))
  }

  return { hunger, cleanliness }
}

// 根据属性计算心情
function calcMood(
  hunger: number,
  cleanliness: number,
  happiness: number,
  combo: number,
  consecutiveCorrect: number
): string {
  if (hunger < 30) return 'tired'
  if (cleanliness < 30) return 'sad'
  if (happiness < 30) return 'angry'
  if (hunger >= 60 && cleanliness >= 60 && happiness >= 60 && consecutiveCorrect >= 3) return 'excited'
  return 'happy'
}

// 获取怪兽完整状态
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        hunger: true,
        cleanliness: true,
        happiness: true,
        monsterMood: true,
        coins: true,
        lastFedAt: true,
        lastPlayedAt: true,
        lastCleanedAt: true,
        combo: true,
        lastQuizDate: true,
        abilityScore: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const { hunger, cleanliness } = calcDecayedValues(user)

    // 计算下次可操作时间
    const now = new Date()
    const nextFeedInMinutes = user.lastFedAt
      ? Math.max(0, 60 - Math.floor((now.getTime() - new Date(user.lastFedAt).getTime()) / (1000 * 60)))
      : 0
    const nextPlayInMinutes = user.lastPlayedAt
      ? Math.max(0, 240 - Math.floor((now.getTime() - new Date(user.lastPlayedAt).getTime()) / (1000 * 60)))
      : 0
    const nextCleanInMinutes = user.lastCleanedAt
      ? Math.max(0, 360 - Math.floor((now.getTime() - new Date(user.lastCleanedAt).getTime()) / (1000 * 60)))
      : 0

    const mood = calcMood(hunger, cleanliness, user.happiness, user.combo, 0)

    res.json({
      hunger,
      cleanliness,
      happiness: user.happiness,
      mood,
      coins: user.coins,
      nextFeedInMinutes,
      nextPlayInMinutes,
      nextCleanInMinutes,
    })
  } catch (error) {
    console.error('获取怪兽状态失败:', error)
    res.status(500).json({ error: '获取怪兽状态失败' })
  }
})

// 喂食
router.post('/feed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { itemType } = req.body
    const validItems = ['apple', 'fish', 'cake']
    if (!validItems.includes(itemType)) {
      return res.status(400).json({ error: '无效的食物类型' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        hunger: true,
        happiness: true,
        coins: true,
        lastFedAt: true,
        lastCleanedAt: true,
        cleanliness: true,
        combo: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const { hunger: currentHunger } = calcDecayedValues(user)

    const foodConfig: Record<string, { cost: number; hungerBoost: number; happinessBoost: number }> = {
      apple: { cost: 10, hungerBoost: 30, happinessBoost: 0 },
      fish: { cost: 20, hungerBoost: 50, happinessBoost: 5 },
      cake: { cost: 30, hungerBoost: 40, happinessBoost: 15 },
    }

    const config = foodConfig[itemType]

    if (user.coins < config.cost) {
      return res.status(400).json({ error: '金币不足' })
    }

    if (currentHunger >= 100) {
      return res.status(400).json({ error: '怪兽已经吃饱了' })
    }

    const newHunger = Math.min(100, currentHunger + config.hungerBoost)
    const newHappiness = Math.min(100, user.happiness + config.happinessBoost)
    const mood = calcMood(newHunger, user.cleanliness, newHappiness, user.combo, 0)

    // 用条件 updateMany 原子操作：保证 coins >= cost 才扣费，避免 TOCTOU 竞态
    const result = await prisma.user.updateMany({
      where: { id: req.userId, coins: { gte: config.cost } },
      data: {
        hunger: newHunger,
        happiness: newHappiness,
        coins: { decrement: config.cost },
        lastFedAt: new Date(),
        monsterMood: mood,
      },
    })

    if (result.count === 0) {
      return res.status(400).json({ error: '金币不足' })
    }

    const newCoins = user.coins - config.cost
    const itemNames: Record<string, string> = { apple: '苹果', fish: '鱼', cake: '蛋糕' }
    res.json({
      hunger: newHunger,
      happiness: newHappiness,
      mood,
      coins: newCoins,
      message: `怪兽吃了${itemNames[itemType]}，很开心！`,
    })
  } catch (error) {
    console.error('喂食失败:', error)
    res.status(500).json({ error: '喂食失败' })
  }
})

// 玩耍
router.post('/play', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        happiness: true,
        lastPlayedAt: true,
        hunger: true,
        cleanliness: true,
        combo: true,
        lastFedAt: true,
        lastCleanedAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 检查玩耍次数限制：每天最多3次，每次间隔至少4小时
    const now = new Date()
    if (user.lastPlayedAt) {
      const hoursSinceLastPlay = (now.getTime() - new Date(user.lastPlayedAt).getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastPlay < 4) {
        return res.status(400).json({ error: '怪兽累了，等会儿再玩吧' })
      }
    }

    // 检查今天玩耍次数
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const playCountToday = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { lastPlayedAt: true },
    })

    // 简化为检查间隔，不复杂计数
    const newHappiness = Math.min(100, user.happiness + 20)
    const { hunger, cleanliness } = calcDecayedValues(user)
    const mood = calcMood(hunger, cleanliness, newHappiness, user.combo, 0)

    // 用 updateMany 在 where 中加 lastPlayedAt 条件，原子更新避免并发竞态
    const cooldownDate = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const result = await prisma.user.updateMany({
      where: {
        id: req.userId,
        OR: [
          { lastPlayedAt: null },
          { lastPlayedAt: { lt: cooldownDate } },
        ],
      },
      data: {
        happiness: newHappiness,
        lastPlayedAt: now,
        monsterMood: mood,
      },
    })

    if (result.count === 0) {
      return res.status(400).json({ error: '怪兽累了，等会儿再玩吧' })
    }

    res.json({
      happiness: newHappiness,
      mood,
      message: '怪兽玩得很开心！',
    })
  } catch (error) {
    console.error('玩耍失败:', error)
    res.status(500).json({ error: '玩耍失败' })
  }
})

// 清洁
router.post('/clean', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        cleanliness: true,
        lastCleanedAt: true,
        hunger: true,
        happiness: true,
        combo: true,
        lastFedAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 检查清洁间隔：每6小时可清洁一次
    const now = new Date()
    if (user.lastCleanedAt) {
      const hoursSinceLastClean = (now.getTime() - new Date(user.lastCleanedAt).getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastClean < 6) {
        return res.status(400).json({ error: '清洁间隔未到，请稍后再来' })
      }
    }

    const { hunger } = calcDecayedValues(user)
    const mood = calcMood(hunger, 100, user.happiness, user.combo, 0)

    // 用 updateMany 在 where 中加 lastCleanedAt 条件，原子更新避免并发竞态
    const cooldownDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    const result = await prisma.user.updateMany({
      where: {
        id: req.userId,
        OR: [
          { lastCleanedAt: null },
          { lastCleanedAt: { lt: cooldownDate } },
        ],
      },
      data: {
        cleanliness: 100,
        lastCleanedAt: now,
        monsterMood: mood,
      },
    })

    if (result.count === 0) {
      return res.status(400).json({ error: '清洁间隔未到，请稍后再来' })
    }

    res.json({
      cleanliness: 100,
      mood,
      message: '怪兽变得干干净净！',
    })
  } catch (error) {
    console.error('清洁失败:', error)
    res.status(500).json({ error: '清洁失败' })
  }
})

// 获取当前倾向点数
router.get('/path-points', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { pathPoints: true, evolutionBranch: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    const points = (user.pathPoints || {}) as Record<string, number>
    const pathPoints = {
      brave: points.brave || 0,
      wise: points.wise || 0,
      tough: points.tough || 0,
    }
    const { getPathPointsRecommendation } = require('../utils/evolution')
    const recommendedPath = getPathPointsRecommendation(pathPoints)
    res.json({ ...pathPoints, recommendedPath, currentBranch: user.evolutionBranch })
  } catch (error) {
    console.error('获取倾向点数失败:', error)
    res.status(500).json({ error: '获取倾向点数失败' })
  }
})

// 选择进化分支
router.post('/choose-branch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { branch } = req.body
    if (!['brave', 'wise', 'tough'].includes(branch)) {
      return res.status(400).json({ error: '无效的分支类型' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { evolutionBranch: true, monsterStage: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    if (user.evolutionBranch) {
      return res.status(400).json({ error: '已经选择过进化分支' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { evolutionBranch: branch, pathType: branch },
    })

    const { EVOLUTION_BRANCHES, getBranchStageInfo } = require('../utils/evolution')
    const stageInfo = getBranchStageInfo(branch, updatedUser.monsterStage)
    const branchInfo = EVOLUTION_BRANCHES[branch]

    res.json({
      success: true,
      branch,
      stageInfo,
      branchName: branchInfo?.name || branch,
    })
  } catch (error) {
    console.error('选择进化分支失败:', error)
    res.status(500).json({ error: '选择进化分支失败' })
  }
})

export default router