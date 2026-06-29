// NPC导师系统路由
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

// 任务类型定义
type TaskType = 'answer_count' | 'correct_count' | 'chapter_complete' | 'streak'

// 任务模板池 - 按学科分类
const TASK_TEMPLATES: Record<TaskType, { title: string; description: string; targetValue: number; rewardCoins: number; rewardExp: number }[]> = {
  answer_count: [
    { title: '勤奋答题', description: '完成5道题目', targetValue: 5, rewardCoins: 10, rewardExp: 20 },
    { title: '学习达人', description: '完成10道题目', targetValue: 10, rewardCoins: 20, rewardExp: 40 },
  ],
  correct_count: [
    { title: '精准答题', description: '答对5道题目', targetValue: 5, rewardCoins: 15, rewardExp: 30 },
    { title: '智慧之星', description: '答对8道题目', targetValue: 8, rewardCoins: 25, rewardExp: 50 },
  ],
  streak: [
    { title: '连击新手', description: '连续答对3道题', targetValue: 3, rewardCoins: 15, rewardExp: 30 },
    { title: '连击高手', description: '连续答对5道题', targetValue: 5, rewardCoins: 30, rewardExp: 60 },
  ],
  chapter_complete: [
    { title: '大陆探索者', description: '通关一个知识节点', targetValue: 1, rewardCoins: 30, rewardExp: 60 },
  ],
}

// GET /api/npc/mentors - 获取所有NPC导师列表
router.get('/mentors', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const mentors = await prisma.npcMentor.findMany({
      include: {
        subject: { select: { name: true, icon: true } },
      },
    })

    // 查询每个导师的未读对话数和未完成任务数
    const mentorInfos = await Promise.all(
      mentors.map(async (m) => {
        const [unreadCount, activeTaskCount] = await Promise.all([
          prisma.npcDialog.count({
            where: { userId, mentorId: m.id, isRead: false },
          }),
          prisma.npcTask.count({
            where: { userId, mentorId: m.id, isCompleted: false, isClaimed: false },
          }),
        ])
        return {
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          personality: m.personality,
          subjectName: m.subject.name,
          subjectIcon: m.subject.icon,
          unreadCount,
          activeTaskCount,
        }
      })
    )

    res.json({ mentors: mentorInfos })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[NPC] 获取导师列表失败:', msg)
    res.status(500).json({ error: '获取导师列表失败' })
  }
})

// GET /api/npc/mentors/:mentorId - 获取某个导师的信息和最新对话
router.get('/mentors/:mentorId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { mentorId } = req.params

    const mentor = await prisma.npcMentor.findUnique({
      where: { id: mentorId },
      include: { subject: { select: { name: true } } },
    })
    if (!mentor) {
      return res.status(404).json({ error: '导师不存在' })
    }

    const [recentDialogs, activeTasks] = await Promise.all([
      prisma.npcDialog.findMany({
        where: { userId, mentorId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.npcTask.findMany({
        where: { userId, mentorId, isClaimed: false },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // 标记对话为已读
    await prisma.npcDialog.updateMany({
      where: { userId, mentorId, isRead: false },
      data: { isRead: true },
    })

    res.json({
      mentor: {
        id: mentor.id,
        name: mentor.name,
        avatar: mentor.avatar,
        personality: mentor.personality,
        greeting: mentor.greeting,
        subjectName: mentor.subject.name,
      },
      recentDialogs: recentDialogs.reverse().map((d) => ({
        id: d.id,
        dialogType: d.dialogType,
        content: d.content,
        createdAt: d.createdAt,
      })),
      activeTasks: activeTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        taskType: t.taskType,
        currentValue: t.currentValue,
        targetValue: t.targetValue,
        rewardCoins: t.rewardCoins,
        rewardExp: t.rewardExp,
        isCompleted: t.isCompleted,
      })),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[NPC] 获取导师详情失败:', msg)
    res.status(500).json({ error: '获取导师详情失败' })
  }
})

// POST /api/npc/tasks/generate-daily - 生成每日NPC任务
router.post('/tasks/generate-daily', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 检查今天是否已生成任务
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const existingTasks = await prisma.npcTask.findMany({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
      include: { mentor: { select: { name: true } } },
    })

    if (existingTasks.length > 0) {
      return res.json({
        tasks: existingTasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          mentorName: t.mentor.name,
        })),
        message: '今日任务已生成',
      })
    }

    // 获取所有导师
    const mentors = await prisma.npcMentor.findMany()
    if (mentors.length === 0) {
      return res.json({ tasks: [], message: '暂无导师数据' })
    }

    // 为每个导师生成1个随机任务
    const taskTypes = Object.keys(TASK_TEMPLATES) as TaskType[]
    const mentorTaskSpecs = mentors.map((mentor) => {
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)]
      const templates = TASK_TEMPLATES[taskType]
      const template = templates[Math.floor(Math.random() * templates.length)]
      return { mentor, taskType, template }
    })

    // M24: npcTask 用 Promise.all 并行 create（需返回 id 关联后续逻辑）
    const createdTaskRecords = await Promise.all(
      mentorTaskSpecs.map(({ mentor, taskType, template }) =>
        prisma.npcTask.create({
          data: {
            userId,
            mentorId: mentor.id,
            title: template.title,
            description: template.description,
            taskType,
            targetValue: template.targetValue,
            rewardCoins: template.rewardCoins,
            rewardExp: template.rewardExp,
            expiredAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        })
      )
    )

    // 并行创建所有任务对话
    await Promise.all(
      mentorTaskSpecs.map(({ mentor, template }) =>
        prisma.npcDialog.create({
          data: {
            userId,
            mentorId: mentor.id,
            dialogType: 'task',
            content: `${mentor.greeting}\n\n今日任务：${template.title}\n${template.description}\n完成奖励：${template.rewardCoins}金币 + ${template.rewardExp}经验`,
          },
        })
      )
    )

    const createdTasks = mentorTaskSpecs.map(({ mentor }, index) => ({
      id: createdTaskRecords[index].id,
      title: createdTaskRecords[index].title,
      description: createdTaskRecords[index].description,
      mentorName: mentor.name,
    }))

    res.json({ tasks: createdTasks, message: `已生成 ${createdTasks.length} 个每日任务` })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[NPC] 生成每日任务失败:', msg)
    res.status(500).json({ error: '生成每日任务失败' })
  }
})

// POST /api/npc/tasks/:taskId/progress - 更新任务进度
router.post('/tasks/:taskId/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { taskId } = req.params
    const { increment } = req.body as { increment: number }

    if (typeof increment !== 'number' || increment <= 0) {
      return res.status(400).json({ error: '增量必须为正数' })
    }

    const task = await prisma.npcTask.findUnique({ where: { id: taskId } })
    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: '任务不存在' })
    }
    if (task.isCompleted) {
      return res.json({
        currentValue: task.currentValue,
        targetValue: task.targetValue,
        isCompleted: true,
        message: '任务已完成',
      })
    }

    const newValue = Math.min(task.currentValue + increment, task.targetValue)
    const isCompleted = newValue >= task.targetValue

    await prisma.npcTask.update({
      where: { id: taskId },
      data: { currentValue: newValue, isCompleted },
    })

    res.json({
      currentValue: newValue,
      targetValue: task.targetValue,
      isCompleted,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[NPC] 更新任务进度失败:', msg)
    res.status(500).json({ error: '更新任务进度失败' })
  }
})

// POST /api/npc/tasks/:taskId/claim - 领取任务奖励
router.post('/tasks/:taskId/claim', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { taskId } = req.params

    // C2: 原子性领取（updateMany where isClaimed:false），防止 TOCTOU 并发重复领取
    const claimResult = await prisma.npcTask.updateMany({
      where: { id: taskId, userId, isClaimed: false, isCompleted: true },
      data: { isClaimed: true },
    })

    if (claimResult.count === 0) {
      // 区分"不存在/无权""未完成""已领取"
      const existing = await prisma.npcTask.findUnique({ where: { id: taskId } })
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: '任务不存在' })
      }
      if (!existing.isCompleted) {
        return res.status(400).json({ error: '任务尚未完成' })
      }
      return res.status(400).json({ error: '奖励已领取' })
    }

    // 重新读取任务获取奖励数值
    const task = await prisma.npcTask.findUnique({ where: { id: taskId } })
    if (!task) {
      return res.status(500).json({ error: '任务数据异常' })
    }

    // M6: 用 $transaction 包裹 task 已标记 + user 发放奖励，保证原子性
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          coins: { increment: task.rewardCoins },
          monsterExp: { increment: task.rewardExp },
        },
      }),
    ])

    res.json({
      success: true,
      rewardCoins: task.rewardCoins,
      rewardExp: task.rewardExp,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[NPC] 领取任务奖励失败:', msg)
    res.status(500).json({ error: '领取任务奖励失败' })
  }
})

// GET /api/npc/dialogs/story - 获取NPC剧情对话（通关节点后触发）
router.get('/dialogs/story', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { chapterId, nodeId } = req.query as { chapterId?: string; nodeId?: string }

    if (!chapterId) {
      return res.status(400).json({ error: '缺少 chapterId 参数' })
    }

    // 获取该章节对应的导师
    const chapter = await prisma.storyChapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { npcMentor: true } } },
    })
    if (!chapter || !chapter.subject.npcMentor) {
      return res.json({ dialogs: [] })
    }

    const mentor = chapter.subject.npcMentor
    const isBossNode = nodeId ? await prisma.storyNode.findUnique({ where: { id: nodeId }, select: { isBoss: true } }) : null

    // 生成剧情对话内容
    const dialogs = [
      {
        speaker: 'mentor' as const,
        avatar: mentor.avatar,
        name: mentor.name,
        content: isBossNode?.isBoss
          ? `太棒了！你成功击败了${chapter.name}的Boss！迷雾正在散去，知识的力量归你所有。`
          : `干得好！你成功通过了这个节点。${chapter.name}的迷雾又散去了一些。`,
      },
      {
        speaker: 'mentor' as const,
        avatar: mentor.avatar,
        name: mentor.name,
        content: '继续探索吧，知识的守护者。前方还有更多挑战等着你！',
      },
    ]

    // 保存对话记录
    await prisma.npcDialog.create({
      data: {
        userId,
        mentorId: mentor.id,
        dialogType: 'story',
        content: dialogs.map((d) => d.content).join('\n\n'),
      },
    })

    res.json({ dialogs })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[NPC] 获取剧情对话失败:', msg)
    res.status(500).json({ error: '获取剧情对话失败' })
  }
})

// 通用方法：更新用户任务进度（供 quiz.ts 调用）
export async function updateNpcTaskProgress(userId: string, taskType: TaskType, increment: number): Promise<void> {
  try {
    const tasks = await prisma.npcTask.findMany({
      where: { userId, taskType, isCompleted: false, isClaimed: false },
    })
    for (const task of tasks) {
      const newValue = Math.min(task.currentValue + increment, task.targetValue)
      const isCompleted = newValue >= task.targetValue
      await prisma.npcTask.update({
        where: { id: task.id },
        data: { currentValue: newValue, isCompleted },
      })
    }
  } catch (err) {
    console.error('[NPC] 更新任务进度失败（非关键）:', err instanceof Error ? err.message : String(err))
  }
}

export default router
