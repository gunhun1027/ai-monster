// 商店路由 - 道具购买、使用、装备
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 获取商店商品列表
router.get('/items', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { coins: true, monsterLevel: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const items = await prisma.item.findMany({
      orderBy: [{ price: 'asc' }],
    })

    res.json({
      success: true,
      data: {
        items: items.map(item => ({
          ...item,
          unlocked: !item.unlockedAt || user.monsterLevel >= item.unlockedAt,
          unlockedAt: item.unlockedAt,
        })),
        userCoins: user.coins,
      },
    })
  } catch (error) {
    console.error('获取商店列表失败:', error)
    res.status(500).json({ error: '获取商店列表失败' })
  }
})

// 购买道具
router.post('/buy', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { itemId, quantity } = req.body

    if (!itemId) {
      return res.status(400).json({ error: '缺少道具ID' })
    }

    // M15: 严格校验购买数量，防止 NaN 绕过金币检查
    const qty = Number(quantity) || 1
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ error: '购买数量无效' })
    }
    const buyQuantity = Math.min(Math.floor(qty), 99)

    const item = await prisma.item.findUnique({ where: { id: itemId } })
    if (!item) {
      return res.status(404).json({ error: '道具不存在' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { coins: true, monsterLevel: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 检查解锁等级
    if (item.unlockedAt && user.monsterLevel < item.unlockedAt) {
      return res.status(400).json({ error: `需要Lv.${item.unlockedAt}才能购买` })
    }

    const totalCost = item.price * buyQuantity
    if (user.coins < totalCost) {
      return res.status(400).json({ error: '金币不足，去答题赚取吧！' })
    }

    // 扣除金币 + 添加/更新背包（事务保证原子性，防止并发超扣）
    const updatedUser = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({
        where: { id: req.userId },
        select: { coins: true },
      })
      if (!fresh || fresh.coins < totalCost) {
        throw new Error('金币不足，去答题赚取吧！')
      }
      const u = await tx.user.update({
        where: { id: req.userId },
        data: { coins: { decrement: totalCost } },
        select: { coins: true },
      })
      await tx.userItem.upsert({
        where: { userId_itemId: { userId: req.userId!, itemId } },
        update: { quantity: { increment: buyQuantity } },
        create: { userId: req.userId!, itemId, quantity: buyQuantity },
      })
      return u
    })

    res.json({
      success: true,
      data: {
        newCoins: updatedUser.coins,
        quantity: buyQuantity,
      },
    })
  } catch (error) {
    console.error('购买道具失败:', error)
    res.status(500).json({ error: '购买道具失败' })
  }
})

// 获取用户背包
router.get('/inventory', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userItems = await prisma.userItem.findMany({
      where: { userId: req.userId },
      include: { item: true },
      orderBy: { item: { type: 'asc' } },
    })

    const activeEffects: string[] = userItems
      .filter(ui => ui.equipped)
      .map(ui => ui.item.effect)

    res.json({
      success: true,
      data: {
        items: userItems.map(ui => ({
          id: ui.id,
          itemId: ui.itemId,
          name: ui.item.name,
          description: ui.item.description,
          type: ui.item.type,
          effect: ui.item.effect,
          icon: ui.item.icon,
          quantity: ui.quantity,
          equipped: ui.equipped,
        })),
        activeEffects,
      },
    })
  } catch (error) {
    console.error('获取背包失败:', error)
    res.status(500).json({ error: '获取背包失败' })
  }
})

// 使用道具（食物/消耗品）
router.post('/use', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userItemId } = req.body
    if (!userItemId) {
      return res.status(400).json({ error: '缺少道具ID' })
    }

    const userItem = await prisma.userItem.findUnique({
      where: { id: userItemId },
      include: { item: true },
    })
    if (!userItem || userItem.userId !== req.userId) {
      return res.status(404).json({ error: '道具不存在' })
    }
    if (userItem.quantity <= 0) {
      return res.status(400).json({ error: '道具数量不足' })
    }

    const item = userItem.item
    let effectResult: Record<string, number | string> = {}

    // 应用效果 + 扣减数量放入事务，保证原子性
    await prisma.$transaction(async (tx) => {
      if (item.type === 'food') {
        // 解析效果如 "hunger+30" 或 "hunger+40,happiness+15"
        const effects = item.effect.split(',')
        const freshUser = await tx.user.findUnique({
          where: { id: req.userId },
          select: { hunger: true, happiness: true },
        })
        if (!freshUser) throw new Error('用户不存在')

        let newHunger = freshUser.hunger
        let newHappiness = freshUser.happiness

        for (const eff of effects) {
          const match = eff.trim().match(/^(\w+)\+(\d+)$/)
          if (match) {
            const [, prop, val] = match
            const numVal = parseInt(val)
            if (prop === 'hunger') newHunger = Math.min(100, newHunger + numVal)
            if (prop === 'happiness') newHappiness = Math.min(100, newHappiness + numVal)
          }
        }

        await tx.user.update({
          where: { id: req.userId },
          data: { hunger: newHunger, happiness: newHappiness },
        })
        effectResult = { hunger: newHunger, happiness: newHappiness }
      } else if (item.type === 'consumable') {
        // 消耗品类如能量饮料，设置 activeBoost
        if (item.effect.startsWith('exp_boost')) {
          const now = new Date()
          const boostEnd = new Date(now.getTime() + 30 * 60 * 1000) // 30分钟
          const u = await tx.user.findUnique({ where: { id: req.userId }, select: { pathPoints: true } })
          const pp = (u?.pathPoints || {}) as Record<string, unknown>
          await tx.user.update({
            where: { id: req.userId },
            data: { pathPoints: { ...pp, expBoostUntil: boostEnd.toISOString() } },
          })
          effectResult = { expBoostUntil: boostEnd.toISOString() }
        }
      } else {
        throw new Error('该道具无法直接使用')
      }

      // M5: 在事务内重新读取并校验数量，防止并发扣减竞态
      const freshItem = await tx.userItem.findUnique({
        where: { id: userItemId },
        select: { quantity: true },
      })
      if (!freshItem || freshItem.quantity <= 0) {
        throw new Error('道具数量不足')
      }
      // 减少数量
      if (freshItem.quantity <= 1) {
        await tx.userItem.delete({ where: { id: userItemId } })
      } else {
        await tx.userItem.update({
          where: { id: userItemId },
          data: { quantity: { decrement: 1 } },
        })
      }
    })

    res.json({
      success: true,
      data: {
        effect: item.effect,
        newStats: effectResult,
      },
    })
  } catch (error) {
    console.error('使用道具失败:', error)
    res.status(500).json({ error: '使用道具失败' })
  }
})

// 装备/卸下装备
router.post('/equip', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userItemId, equip } = req.body
    if (!userItemId) {
      return res.status(400).json({ error: '缺少道具ID' })
    }

    const userItem = await prisma.userItem.findUnique({
      where: { id: userItemId },
      include: { item: true },
    })
    if (!userItem || userItem.userId !== req.userId) {
      return res.status(404).json({ error: '道具不存在' })
    }

    if (!['equipment', 'decoration'].includes(userItem.item.type)) {
      return res.status(400).json({ error: '该道具无法装备' })
    }

    // M4: 装备操作用 $transaction 保证原子性（卸下旧装备 + 装备新装备）
    await prisma.$transaction([
      // 装备时先卸下同类型装备
      ...(equip
        ? [prisma.userItem.updateMany({
            where: { userId: req.userId!, item: { type: userItem.item.type }, equipped: true },
            data: { equipped: false },
          })]
        : []),
      prisma.userItem.update({
        where: { id: userItemId },
        data: { equipped: equip },
      }),
    ])

    res.json({
      success: true,
      data: { equipped: equip },
    })
  } catch (error) {
    console.error('装备操作失败:', error)
    res.status(500).json({ error: '装备操作失败' })
  }
})

export default router
