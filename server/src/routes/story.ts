// 剧情系统路由 - 知识大陆探索 + 剧情分支
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import type { StoryChoice } from '@prisma/client'
import {
  calculateCardDrop,
  dropCardsToUser,
  checkStoryTriggers,
  applyStoryChoice,
} from '../utils/storyCards'
import type { DroppedCardInfo, TriggerType } from '../utils/storyCards'

const router = Router()

router.use(authMiddleware)

// 故事进度类型
type StoryProgress = Record<string, number> // { chapterId: completedNodeOrder }

// 剧情选择精简结构（返回前端）
type ChoiceSummary = {
  id: string
  title: string
  description: string
  options: unknown
  triggerType: string
  triggerValue: number
}

function toChoiceSummary(c: StoryChoice): ChoiceSummary {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    options: c.options,
    triggerType: c.triggerType,
    triggerValue: c.triggerValue,
  }
}

// GET /api/story/chapters - 获取所有大陆（章节）列表及当前进度
router.get('/chapters', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalStars: true, storyProgress: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const progress = (user.storyProgress as StoryProgress) || {}
    const chapters = await prisma.storyChapter.findMany({
      include: {
        subject: { select: { name: true, icon: true } },
        nodes: {
          orderBy: { order: 'asc' },
          select: { id: true, order: true, requiredStars: true, isBoss: true, rewardStars: true },
        },
      },
      orderBy: { order: 'asc' },
    })

    const result = chapters.map((chapter) => {
      const completedOrder = progress[chapter.id] ?? -1 // -1 表示未开始
      const unlockedNodes = chapter.nodes.filter((n) => n.order <= completedOrder + 1 && user.totalStars >= n.requiredStars).length
      const isUnlocked = user.totalStars >= chapter.nodes[0]?.requiredStars
      return {
        id: chapter.id,
        name: chapter.name,
        description: chapter.description,
        icon: chapter.icon,
        themeColor: chapter.themeColor,
        order: chapter.order,
        subjectName: chapter.subject.name,
        subjectIcon: chapter.subject.icon,
        totalNodes: chapter.nodes.length,
        unlockedNodes,
        isUnlocked,
        progressPercent: Math.round(((completedOrder + 1) / chapter.nodes.length) * 100),
      }
    })

    res.json({ chapters: result, totalStars: user.totalStars })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Story] 获取章节列表失败:', msg)
    res.status(500).json({ error: '获取章节列表失败' })
  }
})

// GET /api/story/chapters/:chapterId/nodes - 获取某个大陆的节点详情
router.get('/chapters/:chapterId/nodes', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { chapterId } = req.params
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalStars: true, storyProgress: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const chapter = await prisma.storyChapter.findUnique({
      where: { id: chapterId },
      include: {
        nodes: { orderBy: { order: 'asc' } },
      },
    })
    if (!chapter) {
      return res.status(404).json({ error: '章节不存在' })
    }

    const progress = (user.storyProgress as StoryProgress) || {}
    const completedOrder = progress[chapter.id] ?? -1

    const nodes = chapter.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      description: node.description,
      order: node.order,
      requiredStars: node.requiredStars,
      questionCount: node.questionCount,
      difficulty: node.difficulty,
      isBoss: node.isBoss,
      rewardStars: node.rewardStars,
      isUnlocked: user.totalStars >= node.requiredStars && node.order <= completedOrder + 1,
      isCompleted: node.order <= completedOrder,
    }))

    // 下一个可解锁的节点
    const nextUnlockable = nodes.find((n) => !n.isCompleted && n.isUnlocked) || null

    res.json({
      chapter: {
        id: chapter.id,
        name: chapter.name,
        description: chapter.description,
        icon: chapter.icon,
        themeColor: chapter.themeColor,
      },
      nodes,
      userStars: user.totalStars,
      nextUnlockable,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Story] 获取节点详情失败:', msg)
    res.status(500).json({ error: '获取节点详情失败' })
  }
})

// POST /api/story/nodes/:nodeId/complete - 完成某个节点（答题后调用）
router.post('/nodes/:nodeId/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { nodeId } = req.params
    const { score, correctCount, totalCount } = req.body as { score: number; correctCount: number; totalCount: number }

    if (typeof correctCount !== 'number' || typeof totalCount !== 'number') {
      return res.status(400).json({ error: '参数不完整' })
    }

    if (totalCount <= 0 || correctCount < 0 || correctCount > totalCount) {
      return res.status(400).json({ error: '参数非法' })
    }

    const node = await prisma.storyNode.findUnique({
      where: { id: nodeId },
      include: { chapter: true },
    })
    if (!node) {
      return res.status(404).json({ error: '节点不存在' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalStars: true, storyProgress: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const progress = (user.storyProgress as StoryProgress) || {}
    const currentCompletedOrder = progress[node.chapter.id] ?? -1

    if (node.order > currentCompletedOrder + 1) {
      return res.status(403).json({ error: '节点未解锁' })
    }

    // 判断是否通关（正确率 >= 60%）
    const passRate = correctCount / totalCount
    const isPassed = passRate >= 0.6

    // boss 失败：触发 boss_lose 剧情选择
    if (!isPassed) {
      let pendingStoryChoices: ChoiceSummary[] = []
      if (node.isBoss) {
        const triggered = await checkStoryTriggers(
          [{ type: 'boss_lose' as TriggerType, value: 0 }], userId, node.chapterId
        ).catch((e: unknown) => {
          console.error('[Story] boss_lose 触发检测失败:', e instanceof Error ? e.message : e)
          return [] as StoryChoice[]
        })
        pendingStoryChoices = triggered.map(toChoiceSummary)
      }
      return res.json({
        success: false,
        isPassed: false,
        isBossDefeated: false,
        message: '正确率不足60%，再接再厉！',
        droppedCards: [] as DroppedCardInfo[],
        pendingStoryChoices,
      })
    }

    // 只有首次完成才奖励星星
    if (node.order <= currentCompletedOrder) {
      return res.json({
        success: true,
        isPassed: true,
        earnedStars: 0,
        totalStars: user.totalStars,
        isBossDefeated: node.isBoss,
        message: '该节点已完成过',
        droppedCards: [] as DroppedCardInfo[],
        pendingStoryChoices: [] as ChoiceSummary[],
      })
    }

    // 更新进度
    const newCompletedOrder = Math.max(currentCompletedOrder, node.order)
    const newProgress = { ...progress, [node.chapter.id]: newCompletedOrder }
    const earnedStars = node.rewardStars
    const newTotalStars = user.totalStars + earnedStars

    // 章节是否完成（该节点是章节最后一个）
    const chapterNodeCount = await prisma.storyNode.count({ where: { chapterId: node.chapterId } })
    const isChapterComplete = node.order >= chapterNodeCount - 1

    await prisma.user.update({
      where: { id: userId },
      data: {
        storyProgress: newProgress,
        totalStars: newTotalStars,
      },
    })

    // 卡片掉落 + 剧情触发（仅首次完成）
    let droppedCards: DroppedCardInfo[] = []
    let pendingStoryChoices: ChoiceSummary[] = []
    try {
      const droppedRaw = await calculateCardDrop({
        subjectId: node.chapter.subjectId,
        isCorrect: true,
        combo: 0,
        isBossWin: node.isBoss,
        isChapterComplete,
      })
      droppedCards = await dropCardsToUser(userId, droppedRaw)

      const triggers: { type: TriggerType; value: number }[] = []
      if (node.isBoss) triggers.push({ type: 'boss_win', value: 0 })
      const triggeredChoices = await checkStoryTriggers(triggers, userId, node.chapterId)
      pendingStoryChoices = triggeredChoices.map(toChoiceSummary)
    } catch (e: unknown) {
      console.error('[Story] 卡片掉落/触发失败（非关键）:', e instanceof Error ? e.message : e)
    }

    res.json({
      success: true,
      isPassed: true,
      earnedStars,
      totalStars: newTotalStars,
      isBossDefeated: node.isBoss,
      isChapterComplete,
      score,
      message: node.isBoss ? 'Boss已击败！' : '节点通关！',
      droppedCards,
      pendingStoryChoices,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Story] 完成节点失败:', msg)
    res.status(500).json({ error: '完成节点失败' })
  }
})

// GET /api/story/choices/available - 当前可触发的剧情选择（基于 combo/wrongStreak）
router.get('/choices/available', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { combo: true, wrongStreak: true },
    })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    const triggers: { type: TriggerType; value: number }[] = []
    if (user.combo >= 3) triggers.push({ type: 'streak_correct', value: user.combo })
    if (user.wrongStreak >= 2) triggers.push({ type: 'streak_wrong', value: user.wrongStreak })

    const choices = await checkStoryTriggers(triggers, userId)
    res.json({ choices: choices.map(toChoiceSummary) })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Story] 获取可触发选择失败:', msg)
    res.status(500).json({ error: '获取可触发选择失败' })
  }
})

// GET /api/story/choices/:chapterId/first-enter - 进入章节时的首次触发
router.get('/choices/:chapterId/first-enter', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { chapterId } = req.params
    const choices = await checkStoryTriggers(
      [{ type: 'first_enter' as TriggerType, value: 0 }], userId, chapterId
    )
    res.json({ choices: choices.map(toChoiceSummary) })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Story] 获取首入触发失败:', msg)
    res.status(500).json({ error: '获取首入触发失败' })
  }
})

// POST /api/story/choices/:choiceId/select - 玩家做出剧情选择
router.post('/choices/:choiceId/select', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { choiceId } = req.params
    const { optionId } = req.body as { optionId: string }
    if (!optionId) {
      return res.status(400).json({ error: '缺少 optionId' })
    }
    const result = await applyStoryChoice(userId, choiceId, optionId)
    res.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Story] 做出选择失败:', msg)
    res.status(500).json({ error: '做出选择失败' })
  }
})

export default router
