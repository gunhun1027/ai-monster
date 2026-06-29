// 学习小组路由（知识守护者联盟）
// 提供小组创建/查询/加入/退出、目标管理、进度更新、组内排行
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

// 计算当前周一时间（用于判断 weekly 字段是否需要重置）
function getMondayStart(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay() // 0=Sunday, 1=Monday...
  const diff = day === 0 ? -6 : 1 - day // 回到本周一
  date.setDate(date.getDate() + diff)
  return date
}

// ===== 创建小组 =====
// POST /
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { name, description, avatar } = req.body as { name?: string; description?: string; avatar?: string }

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 30) {
      return res.status(400).json({ error: '小组名称需2-30个字符' })
    }
    if (description && description.length > 200) {
      return res.status(400).json({ error: '小组描述最多200个字符' })
    }

    const finalAvatar = (avatar && avatar.trim()) || '🛡️'
    const monday = getMondayStart(new Date())

    // 创建小组 + 创建者自动成为 owner 成员（事务保证一致性）
    const group = await prisma.studyGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        avatar: finalAvatar,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner',
            weekStart: monday,
          },
        },
      },
      include: {
        members: { select: { id: true, userId: true, role: true } },
      },
    })

    res.status(201).json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        ownerId: group.ownerId,
        createdAt: group.createdAt,
      },
    })
  } catch (error) {
    console.error('创建小组失败:', error)
    res.status(500).json({ error: '创建小组失败' })
  }
})

// ===== 获取公开小组列表 =====
// GET /?page=1&limit=20
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50)
    const search = (req.query.search as string) || ''

    const where: Prisma.StudyGroupWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {}

    const [groups, total] = await Promise.all([
      prisma.studyGroup.findMany({
        where,
        include: {
          members: { select: { id: true } },
          owner: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.studyGroup.count({ where }),
    ])

    res.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatar: g.avatar,
        memberCount: g.members.length,
        maxMembers: g.maxMembers,
        ownerName: g.owner.username,
        createdAt: g.createdAt,
      })),
      total,
    })
  } catch (error) {
    console.error('获取小组列表失败:', error)
    res.status(500).json({ error: '获取小组列表失败' })
  }
})

// ===== 获取我加入的小组 =====
// GET /my
router.get('/my', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: { select: { id: true, weeklyQuizCount: true, weekStart: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    const thisMonday = getMondayStart(new Date())

    const groups = await Promise.all(
      memberships.map(async (m) => {
        // 自动重置过期 weekly
        if (new Date(m.weekStart) < thisMonday) {
          await prisma.groupMember.update({
            where: { id: m.id },
            data: { weeklyQuizCount: 0, weeklyCorrectCount: 0, weekStart: thisMonday },
          })
        }
        // 计算小组本周总答题数（直接聚合当前成员，含已重置后的最新数据）
        let weeklyProgress = 0
        const freshMembers = await prisma.groupMember.findMany({
          where: { groupId: m.group.id },
          select: { weeklyQuizCount: true, weekStart: true },
        })
        for (const mem of freshMembers) {
          if (new Date(mem.weekStart) >= thisMonday) {
            weeklyProgress += mem.weeklyQuizCount
          }
        }
        return {
          id: m.group.id,
          name: m.group.name,
          avatar: m.group.avatar,
          description: m.group.description,
          role: m.role,
          memberCount: freshMembers.length,
          maxMembers: m.group.maxMembers,
          weeklyProgress,
        }
      })
    )

    res.json({ groups })
  } catch (error) {
    console.error('获取我的小组失败:', error)
    res.status(500).json({ error: '获取我的小组失败' })
  }
})

// ===== 加入小组 =====
// POST /:groupId/join
router.post('/:groupId/join', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { groupId } = req.params

    // 检查小组是否存在
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, maxMembers: true },
    })
    if (!group) {
      return res.status(404).json({ error: '小组不存在' })
    }

    // 检查是否已是成员
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (existing) {
      return res.status(400).json({ error: '你已是该小组成员' })
    }

    const monday = getMondayStart(new Date())

    try {
      await prisma.$transaction(async (tx) => {
        // 在事务内重新 count 成员数，超限则抛错回滚
        const memberCount = await tx.groupMember.count({ where: { groupId } })
        if (memberCount >= group.maxMembers) {
          throw new Error('GROUP_FULL')
        }
        await tx.groupMember.create({
          data: {
            groupId,
            userId,
            role: 'member',
            weekStart: monday,
          },
        })
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'GROUP_FULL') {
        return res.status(400).json({ error: '小组人数已满' })
      }
      throw err
    }

    res.json({ success: true, message: `已加入小组「${group.name}」` })
  } catch (error) {
    console.error('加入小组失败:', error)
    res.status(500).json({ error: '加入小组失败' })
  }
})

// ===== 退出小组 =====
// POST /:groupId/leave
router.post('/:groupId/leave', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { groupId } = req.params

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (!membership) {
      return res.status(400).json({ error: '你不在该小组中' })
    }

    // owner 不能直接退出（需先转让或解散）
    if (membership.role === 'owner') {
      return res.status(400).json({ error: '组长不能直接退出，请先转让组长或解散小组' })
    }

    await prisma.groupMember.delete({
      where: { id: membership.id },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('退出小组失败:', error)
    res.status(500).json({ error: '退出小组失败' })
  }
})

// ===== 获取小组详情 =====
// GET /:groupId
router.get('/:groupId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { groupId } = req.params

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        owner: { select: { username: true } },
        members: {
          include: {
            user: { select: { username: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        goals: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!group) {
      return res.status(404).json({ error: '小组不存在' })
    }

    const thisMonday = getMondayStart(new Date())
    // 自动重置过期 weekly（批量更新）
    const needResetIds = group.members
      .filter((m) => new Date(m.weekStart) < thisMonday)
      .map((m) => m.id)
    if (needResetIds.length > 0) {
      await prisma.groupMember.updateMany({
        where: { id: { in: needResetIds }, weekStart: { lt: thisMonday } },
        data: { weeklyQuizCount: 0, weeklyCorrectCount: 0, weekStart: thisMonday },
      })
    }
    for (const m of group.members) {
      if (new Date(m.weekStart) < thisMonday) {
        m.weeklyQuizCount = 0
        m.weeklyCorrectCount = 0
      }
    }

    const myMembership = group.members.find((m) => m.userId === userId)

    res.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        ownerName: group.owner.username,
        ownerId: group.ownerId,
        memberCount: group.members.length,
        maxMembers: group.maxMembers,
        createdAt: group.createdAt,
      },
      members: group.members.map((m) => ({
        userId: m.userId,
        username: m.user.username,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        weeklyQuizCount: m.weeklyQuizCount,
        weeklyCorrectCount: m.weeklyCorrectCount,
        accuracy: m.weeklyQuizCount > 0 ? Math.round((m.weeklyCorrectCount / m.weeklyQuizCount) * 100) : 0,
      })),
      goals: group.goals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        targetType: g.targetType,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        rewardCoins: g.rewardCoins,
        isCompleted: g.isCompleted,
        deadline: g.deadline,
      })),
      isMember: !!myMembership,
      isOwner: group.ownerId === userId,
      myRole: myMembership?.role || null,
    })
  } catch (error) {
    console.error('获取小组详情失败:', error)
    res.status(500).json({ error: '获取小组详情失败' })
  }
})

// ===== 创建小组目标（仅 owner/admin） =====
// POST /:groupId/goals
router.post('/:groupId/goals', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { groupId } = req.params
    const { title, description, targetType, targetValue, deadline } = req.body as {
      title?: string
      description?: string
      targetType?: string
      targetValue?: number
      deadline?: string
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: '目标标题不能为空' })
    }
    if (!['total_quiz', 'total_correct', 'streak_days'].includes(targetType || '')) {
      return res.status(400).json({ error: '目标类型无效' })
    }
    if (!targetValue || targetValue < 1) {
      return res.status(400).json({ error: '目标值需大于0' })
    }

    // 权限检查
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: '无权限创建目标' })
    }

    const goal = await prisma.groupGoal.create({
      data: {
        groupId,
        title: title.trim(),
        description: description?.trim() || '',
        targetType: targetType!,
        targetValue: targetValue,
        deadline: deadline ? new Date(deadline) : null,
      },
    })

    res.status(201).json({ goal })
  } catch (error) {
    console.error('创建小组目标失败:', error)
    res.status(500).json({ error: '创建小组目标失败' })
  }
})

// ===== 更新小组进度（答题后自动调用） =====
// POST /:groupId/progress
router.post('/:groupId/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { groupId } = req.params
    const { quizCount, correctCount } = req.body as { quizCount?: number; correctCount?: number }

    if (typeof quizCount !== 'number' || typeof correctCount !== 'number') {
      return res.status(400).json({ error: '参数无效' })
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (!membership) {
      return res.status(400).json({ error: '你不在该小组中' })
    }

    // 自动重置跨周数据
    const thisMonday = getMondayStart(new Date())
    const needReset = new Date(membership.weekStart) < thisMonday

    // 查询小组未完成目标
    const goals = await prisma.groupGoal.findMany({
      where: { groupId, isCompleted: false },
    })

    const updatedGoals: Array<{ id: string; isCompleted: boolean; rewardCoins: number }> = []

    await prisma.$transaction(async (tx) => {
      // 重置跨周数据（如需要）
      if (needReset) {
        await tx.groupMember.update({
          where: { id: membership.id },
          data: { weeklyQuizCount: 0, weeklyCorrectCount: 0, weekStart: thisMonday },
        })
      }

      // 累加本周数据（用 increment 避免竞态）
      await tx.groupMember.update({
        where: { id: membership.id },
        data: {
          weeklyQuizCount: { increment: quizCount },
          weeklyCorrectCount: { increment: correctCount },
        },
      })

      // 更新小组目标进度（仅 total_quiz / total_correct 类型；streak_days 需要外部传入）
      for (const goal of goals) {
        if (goal.targetType === 'total_quiz') {
          const newValue = goal.currentValue + quizCount
          const isCompleted = newValue >= goal.targetValue
          await tx.groupGoal.update({
            where: { id: goal.id },
            data: { currentValue: { increment: quizCount }, isCompleted },
          })
          updatedGoals.push({ id: goal.id, isCompleted, rewardCoins: goal.rewardCoins })
        } else if (goal.targetType === 'total_correct') {
          const newValue = goal.currentValue + correctCount
          const isCompleted = newValue >= goal.targetValue
          await tx.groupGoal.update({
            where: { id: goal.id },
            data: { currentValue: { increment: correctCount }, isCompleted },
          })
          updatedGoals.push({ id: goal.id, isCompleted, rewardCoins: goal.rewardCoins })
        }
        // streak_days 类型由外部进度直接传入累计值，此处不处理
      }
    })

    res.json({ updatedGoals })
  } catch (error) {
    console.error('更新小组进度失败:', error)
    res.status(500).json({ error: '更新小组进度失败' })
  }
})

// ===== 小组排行榜（组内成员周排名） =====
// GET /:groupId/ranking
router.get('/:groupId/ranking', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { weeklyQuizCount: 'desc' },
    })

    const thisMonday = getMondayStart(new Date())

    const ranking = members
      .map((m) => {
        // 跨周数据视为 0（不直接修改 DB，仅展示用）
        const weeklyQuiz = new Date(m.weekStart) < thisMonday ? 0 : m.weeklyQuizCount
        const weeklyCorrect = new Date(m.weekStart) < thisMonday ? 0 : m.weeklyCorrectCount
        return {
          userId: m.userId,
          username: m.user.username,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
          weeklyQuizCount: weeklyQuiz,
          weeklyCorrectCount: weeklyCorrect,
          accuracy: weeklyQuiz > 0 ? Math.round((weeklyCorrect / weeklyQuiz) * 100) : 0,
        }
      })
      .sort((a, b) => b.weeklyQuizCount - a.weeklyQuizCount || b.weeklyCorrectCount - a.weeklyCorrectCount)

    res.json({ ranking })
  } catch (error) {
    console.error('获取小组排行榜失败:', error)
    res.status(500).json({ error: '获取小组排行榜失败' })
  }
})

// 导出工具函数：在 quiz.ts 中答题后调用，非阻塞更新所有小组成员进度
export async function updateUserGroupProgress(userId: string, quizCount: number, correctCount: number): Promise<void> {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: { group: { include: { goals: { where: { isCompleted: false } } } } },
    })

    const thisMonday = getMondayStart(new Date())

    for (const m of memberships) {
      let baseQuiz = m.weeklyQuizCount
      let baseCorrect = m.weeklyCorrectCount
      if (new Date(m.weekStart) < thisMonday) {
        baseQuiz = 0
        baseCorrect = 0
        await prisma.groupMember.update({
          where: { id: m.id },
          data: { weeklyQuizCount: 0, weeklyCorrectCount: 0, weekStart: thisMonday },
        })
      }

      await prisma.groupMember.update({
        where: { id: m.id },
        data: {
          weeklyQuizCount: baseQuiz + quizCount,
          weeklyCorrectCount: baseCorrect + correctCount,
        },
      })

      // 更新该小组的未完成目标
      for (const goal of m.group.goals) {
        if (goal.targetType === 'total_quiz') {
          const newValue = goal.currentValue + quizCount
          const isCompleted = newValue >= goal.targetValue
          await prisma.groupGoal.update({
            where: { id: goal.id },
            data: { currentValue: newValue, isCompleted },
          })
        } else if (goal.targetType === 'total_correct') {
          const newValue = goal.currentValue + correctCount
          const isCompleted = newValue >= goal.targetValue
          await prisma.groupGoal.update({
            where: { id: goal.id },
            data: { currentValue: newValue, isCompleted },
          })
        }
      }
    }
  } catch (err) {
    console.error('[Group Progress] 更新小组进度失败（非关键）:', err instanceof Error ? err.message : String(err))
  }
}

export default router
