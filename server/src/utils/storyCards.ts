// 剧情系统 v2 共享工具函数：卡片掉落、剧情触发检测、称号解锁
import { prisma } from '../lib/prisma'
import type { KnowledgeCard, StoryChoice, User } from '@prisma/client'

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type StoryRouteType = 'brave' | 'cultivation' | 'balanced'
export type TriggerType = 'streak_correct' | 'streak_wrong' | 'boss_win' | 'boss_lose' | 'first_enter'

// 称号定义（前端展示用）
export interface TitleDef {
  id: string
  name: string
  icon: string
  color: string
  desc: string
}

export const TITLE_DEFINITIONS: TitleDef[] = [
  { id: 'brave_warrior', name: '勇者战士', icon: '⚔️', color: '#ef4444', desc: '勇者之路且累计答对50题' },
  { id: 'wise_scholar', name: '博学智者', icon: '🎓', color: '#10b981', desc: '平衡之路且累计答题100题' },
  { id: 'persistent_trainee', name: '坚韧修行者', icon: '🧘', color: '#3b82f6', desc: '修行之路且连续学习7天' },
  { id: 'boss_slayer', name: 'Boss猎手', icon: '🐉', color: '#f59e0b', desc: '击败4个Boss' },
  { id: 'perfect_master', name: '完美大师', icon: '💎', color: '#a855f7', desc: '达成20连击' },
]

// 默认称号
export const DEFAULT_TITLE = '知识新手'

// 掉落卡片返回给前端的精简结构
export interface DroppedCardInfo {
  cardId: string
  name: string
  content: string
  funFact: string | null
  rarity: string
  icon: string
  themeColor: string
  isNew: boolean
}

// 触发上下文
export interface DropContext {
  subjectId: string
  isCorrect: boolean
  combo: number
  isBossWin?: boolean
  isChapterComplete?: boolean
}

// 随机选取一张指定稀有度的卡片
async function findRandomCard(subjectId: string, rarity: CardRarity): Promise<KnowledgeCard | null> {
  const cards = await prisma.knowledgeCard.findMany({ where: { subjectId, rarity } })
  if (cards.length === 0) return null
  return cards[Math.floor(Math.random() * cards.length)]
}

// 计算掉落（查DB），返回应掉落的卡片记录数组
export async function calculateCardDrop(ctx: DropContext): Promise<KnowledgeCard[]> {
  const drops: KnowledgeCard[] = []
  const { subjectId, isCorrect, combo, isBossWin, isChapterComplete } = ctx

  // 基础：答对30%普通卡
  if (isCorrect && Math.random() < 0.3) {
    const card = await findRandomCard(subjectId, 'common')
    if (card) drops.push(card)
  }
  // combo史诗：combo>=5 15%
  if (combo >= 5 && Math.random() < 0.15) {
    const card = await findRandomCard(subjectId, 'epic')
    if (card) drops.push(card)
  }
  // boss稀有：boss胜50%
  if (isBossWin && Math.random() < 0.5) {
    const card = await findRandomCard(subjectId, 'rare')
    if (card) drops.push(card)
  }
  // 章节完成传说
  if (isChapterComplete) {
    const card = await findRandomCard(subjectId, 'legendary')
    if (card) drops.push(card)
  }
  return drops
}

// 把掉落卡片写入用户背包（upsert），返回精简信息
export async function dropCardsToUser(userId: string, cards: KnowledgeCard[]): Promise<DroppedCardInfo[]> {
  const results: DroppedCardInfo[] = []
  for (const card of cards) {
    const existing = await prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId: card.id } },
      select: { id: true },
    })
    await prisma.userCard.upsert({
      where: { userId_cardId: { userId, cardId: card.id } },
      create: { userId, cardId: card.id, count: 1, isNew: true },
      update: { count: { increment: 1 } },
    })
    results.push({
      cardId: card.id, name: card.name, content: card.content, funFact: card.funFact,
      rarity: card.rarity, icon: card.icon, themeColor: card.themeColor, isNew: !existing,
    })
  }
  // 更新收集数（去重卡片种类数）
  if (cards.length > 0) {
    const distinctCount = await prisma.userCard.count({ where: { userId } })
    await prisma.user.update({
      where: { id: userId },
      data: { cardCollectionCount: distinctCount },
    })
  }
  return results
}

// 检测剧情触发：返回待处理的 StoryChoice（未做过 + 阈值匹配）
export async function checkStoryTriggers(
  triggers: { type: TriggerType; value: number }[],
  userId: string,
  chapterId?: string
): Promise<StoryChoice[]> {
  if (triggers.length === 0) return []
  const types = triggers.map(t => t.type)
  const where: { triggerType: { in: TriggerType[] }; chapterId?: string } = { triggerType: { in: types } }
  if (chapterId) where.chapterId = chapterId

  const choices = await prisma.storyChoice.findMany({ where })
  if (choices.length === 0) return []

  // 过滤已做过的
  const done = await prisma.userStoryChoice.findMany({
    where: { userId },
    select: { choiceId: true },
  })
  const doneIds = new Set(done.map(d => d.choiceId))

  return choices.filter((c) => {
    if (doneIds.has(c.id)) return false
    // 阈值匹配（仅 streak 类型有阈值意义）
    if (c.triggerValue > 0 && (c.triggerType === 'streak_correct' || c.triggerType === 'streak_wrong')) {
      const t = triggers.find(tr => tr.type === c.triggerType)
      return t ? t.value >= c.triggerValue : false
    }
    return true
  })
}

// 统计已击败 Boss 数量（基于 storyProgress）
async function countBossDefeated(user: User): Promise<number> {
  const progress = (user.storyProgress as Record<string, number>) || {}
  const chapters = await prisma.storyChapter.findMany({
    include: { nodes: { where: { isBoss: true }, select: { order: true } } },
  })
  let count = 0
  for (const ch of chapters) {
    for (const boss of ch.nodes) {
      if ((progress[ch.id] ?? -1) >= boss.order) count++
    }
  }
  return count
}

// 检查称号解锁，返回新解锁的称号 id 列表（并写入 unlockedTitles）
export async function checkTitles(userId: string, user: User): Promise<TitleDef[]> {
  const unlocked = (user.unlockedTitles as string[]) || []
  const newlyUnlocked: string[] = []

  if (!unlocked.includes('brave_warrior') && user.storyRoute === 'brave' && user.totalCorrect >= 50) {
    newlyUnlocked.push('brave_warrior')
  }
  if (!unlocked.includes('wise_scholar') && user.storyRoute === 'balanced' && user.totalQuiz >= 100) {
    newlyUnlocked.push('wise_scholar')
  }
  if (!unlocked.includes('persistent_trainee') && user.storyRoute === 'cultivation' && user.streakDays >= 7) {
    newlyUnlocked.push('persistent_trainee')
  }
  if (!unlocked.includes('perfect_master') && user.maxCombo >= 20) {
    newlyUnlocked.push('perfect_master')
  }
  if (!unlocked.includes('boss_slayer')) {
    const bossCount = await countBossDefeated(user)
    if (bossCount >= 4) newlyUnlocked.push('boss_slayer')
  }

  if (newlyUnlocked.length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { unlockedTitles: [...unlocked, ...newlyUnlocked] },
    })
  }
  return TITLE_DEFINITIONS.filter(t => newlyUnlocked.includes(t.id))
}

// 玩家做出剧情选择后，更新 storyRoute + storyChoices 记录
export interface SelectResult {
  success: boolean
  routeEffect: StoryRouteType | null
  unlockedTitle: TitleDef | null
  nextDialog: string | null
  optionText: string | null
}

export async function applyStoryChoice(
  userId: string,
  choiceId: string,
  optionId: string
): Promise<SelectResult> {
  const choice = await prisma.storyChoice.findUnique({ where: { id: choiceId } })
  if (!choice) {
    return { success: false, routeEffect: null, unlockedTitle: null, nextDialog: null, optionText: null }
  }

  const options = (choice.options as Array<{ id: string; text: string; routeEffect: StoryRouteType; nextDialog?: string }>) || []
  const option = options.find(o => o.id === optionId)
  if (!option) {
    return { success: false, routeEffect: null, unlockedTitle: null, nextDialog: null, optionText: null }
  }

  // 记录选择 + 更新 storyRoute 放入事务保证原子性，事务内 findUnique+create 防止并发 P2002
  const txResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.userStoryChoice.findUnique({
      where: { userId_choiceId: { userId, choiceId } },
    })
    if (existing) {
      return { alreadyDone: true, userExists: false }
    }

    await tx.userStoryChoice.create({
      data: {
        userId, choiceId, selectedOption: optionId, routeEffect: option.routeEffect,
      },
    })

    // 更新 storyRoute：累计 brave/cultivation 倾向，多者为主；均衡为 balanced
    const user = await tx.user.findUnique({ where: { id: userId }, select: { storyChoices: true, storyRoute: true } })
    if (!user) return { alreadyDone: false, userExists: false }

    const choicesLog = (user.storyChoices as Array<{ choiceId: string; choice: string; timestamp: string }>) || []
    choicesLog.push({ choiceId, choice: optionId, timestamp: new Date().toISOString() })

    // 重新统计路线倾向
    const allUserChoices = await tx.userStoryChoice.findMany({
      where: { userId },
      select: { routeEffect: true },
    })
    const braveCount = allUserChoices.filter(c => c.routeEffect === 'brave').length
    const cultivationCount = allUserChoices.filter(c => c.routeEffect === 'cultivation').length

    let newRoute: StoryRouteType | 'none' = 'balanced'
    if (braveCount > cultivationCount && braveCount >= 2) newRoute = 'brave'
    else if (cultivationCount > braveCount && cultivationCount >= 2) newRoute = 'cultivation'
    else if (allUserChoices.length === 0) newRoute = 'none'

    await tx.user.update({
      where: { id: userId },
      data: { storyChoices: choicesLog, storyRoute: newRoute },
    })

    return { alreadyDone: false, userExists: true }
  })

  if (txResult.alreadyDone) {
    return {
      success: false, routeEffect: null, unlockedTitle: null,
      nextDialog: option.nextDialog ?? null, optionText: option.text,
    }
  }

  if (!txResult.userExists) {
    return {
      success: true, routeEffect: option.routeEffect, unlockedTitle: null,
      nextDialog: option.nextDialog ?? null, optionText: option.text,
    }
  }

  // 检查称号
  const updatedUser = await prisma.user.findUnique({ where: { id: userId } })
  const newTitles = updatedUser ? await checkTitles(userId, updatedUser) : []
  return {
    success: true,
    routeEffect: option.routeEffect,
    unlockedTitle: newTitles[0] ?? null,
    nextDialog: option.nextDialog ?? null,
    optionText: option.text,
  }
}
