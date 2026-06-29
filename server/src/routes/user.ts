// 用户称号系统路由
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { TITLE_DEFINITIONS } from '../utils/storyCards'

const router = Router()
router.use(authMiddleware)

// GET /api/user/titles - 当前称号 + 已解锁 + 全部定义
router.get('/titles', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { title: true, unlockedTitles: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    res.json({
      currentTitle: user.title,
      unlockedTitles: user.unlockedTitles,
      allTitles: TITLE_DEFINITIONS,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Titles] 获取称号失败:', msg)
    res.status(500).json({ error: '获取称号失败' })
  }
})

// POST /api/user/titles/equip - 装备称号
router.post('/titles/equip', async (req: Request, res: Response) => {
  try {
    const { titleId } = req.body as { titleId: string }
    const def = TITLE_DEFINITIONS.find((t) => t.id === titleId)
    if (!def) {
      return res.status(400).json({ error: '称号不存在' })
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { unlockedTitles: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    const unlocked = (user.unlockedTitles as string[]) || []
    if (!unlocked.includes(titleId)) {
      return res.status(403).json({ error: '尚未解锁该称号' })
    }
    await prisma.user.update({
      where: { id: req.userId },
      data: { title: def.name },
    })
    res.json({ success: true, currentTitle: def.name })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Titles] 装备称号失败:', msg)
    res.status(500).json({ error: '装备称号失败' })
  }
})

export default router
