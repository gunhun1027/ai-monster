// 知识卡片收集系统路由
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

// GET /api/cards - 全部卡片定义
router.get('/', async (req: Request, res: Response) => {
  try {
    const cards = await prisma.knowledgeCard.findMany({
      include: { subject: { select: { name: true } } },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
    })
    res.json({
      cards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        content: c.content,
        funFact: c.funFact,
        rarity: c.rarity,
        icon: c.icon,
        themeColor: c.themeColor,
        subjectName: c.subject.name,
      })),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Cards] 获取卡片列表失败:', msg)
    res.status(500).json({ error: '获取卡片列表失败' })
  }
})

// GET /api/cards/collection - 当前用户收集情况
router.get('/collection', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const [allCards, userCards] = await Promise.all([
      prisma.knowledgeCard.findMany({ select: { id: true, rarity: true } }),
      prisma.userCard.findMany({
        where: { userId },
        include: { card: { select: { name: true, rarity: true, icon: true, themeColor: true } } },
        orderBy: { obtainedAt: 'desc' },
      }),
    ])

    const byRarity = { common: 0, rare: 0, epic: 0, legendary: 0 }
    for (const uc of userCards) {
      const r = uc.card.rarity as keyof typeof byRarity
      if (r in byRarity) byRarity[r]++
    }

    const collected = userCards.map((uc) => ({
      cardId: uc.cardId,
      name: uc.card.name,
      rarity: uc.card.rarity,
      icon: uc.card.icon,
      themeColor: uc.card.themeColor,
      count: uc.count,
      obtainedAt: uc.obtainedAt,
      isNew: uc.isNew,
    }))

    res.json({
      collected,
      totalCards: allCards.length,
      collectedCount: userCards.length,
      collectionRate: allCards.length > 0 ? userCards.length / allCards.length : 0,
      byRarity,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Cards] 获取收集情况失败:', msg)
    res.status(500).json({ error: '获取收集情况失败' })
  }
})

// GET /api/cards/:cardId - 单卡详情
router.get('/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params
    const userId = req.userId!
    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId },
      include: { subject: { select: { name: true } } },
    })
    if (!card) {
      return res.status(404).json({ error: '卡片不存在' })
    }
    const userCard = await prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId } },
    })
    res.json({
      card: {
        id: card.id,
        name: card.name,
        content: card.content,
        funFact: card.funFact,
        rarity: card.rarity,
        icon: card.icon,
        themeColor: card.themeColor,
        subjectName: card.subject.name,
      },
      isCollected: !!userCard,
      count: userCard?.count ?? 0,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Cards] 获取卡片详情失败:', msg)
    res.status(500).json({ error: '获取卡片详情失败' })
  }
})

export default router
