// 答题路由 - 提交答案、经验计算、升级进化、连胜判断
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { calculateExp, processLevelUp, calculateAbilityScore, EVOLUTION_STAGES, EVOLUTION_COIN_REWARD } from '../utils/evolution'
import { checkAchievements } from '../utils/achievements'
import { updateNpcTaskProgress } from './npc'
import { calculateCardDrop, dropCardsToUser, checkStoryTriggers, checkTitles } from '../utils/storyCards'
import type { DroppedCardInfo, TriggerType, TitleDef } from '../utils/storyCards'
import { updateUserGroupProgress } from './groups'

const router = Router()

// 提交答案 - 使用事务优化性能，避免多次串行查询
router.post('/submit', authMiddleware, async (req: Request, res: Response) => {
  const submitStartTime = Date.now()
  try {
    const { questionId, selectedOption, timeTaken } = req.body
    const userId = req.userId!

    // 参数校验
    if (!questionId || selectedOption === undefined || timeTaken === undefined) {
      return res.status(400).json({ error: '参数不完整' })
    }
    if (typeof selectedOption !== 'number' || selectedOption < -1 || selectedOption > 3) {
      // 填空题的 fillblankAnswer 通过 body 传入，selectedOption 可以是 -2 表示填空题模式
      if (selectedOption !== -2) {
        return res.status(400).json({ error: '答案选项无效' })
      }
    }

    // 顺序查询（Neon pooler不支持交互式事务，避免P2028错误）
    const question = await prisma.question.findUnique({ where: { id: questionId } })
    if (!question) {
      return res.status(404).json({ error: '题目不存在' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 判断答案是否正确
    let isCorrect: boolean
    const questionType = question.type || 'choice'
    const fillblankAnswer = req.body.fillblankAnswer as string | undefined

    if (questionType === 'fillblank' && fillblankAnswer !== undefined) {
      // 填空题：不区分大小写，去除首尾空格后比较，支持多答案用 | 分隔
      const userAnswer = fillblankAnswer.trim().toLowerCase()
      const correctAnswers = question.answer.split('|').map(a => a.trim().toLowerCase())
      isCorrect = correctAnswers.includes(userAnswer)
    } else {
      // 选择题：answer 字段存储正确答案索引 "0"-"3"
      isCorrect = selectedOption >= 0 && selectedOption === parseInt(question.answer)
    }

    // 计算连胜天数
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // M2: 重新读取用户最新的 combo/streak 字段，缓解并发提交导致的丢失更新
    const freshComboData = await prisma.user.findUnique({
      where: { id: userId },
      select: { combo: true, wrongStreak: true, maxCombo: true, streakDays: true, lastQuizDate: true },
    })
    if (!freshComboData) {
      return res.status(404).json({ error: '用户不存在' })
    }

    let newCombo = isCorrect ? freshComboData.combo + 1 : 0
    // 答错连击（用于触发修行之路剧情）：答错+1，答对归0
    const newWrongStreak = isCorrect ? 0 : (freshComboData.wrongStreak + 1)
    let newStreakDays = freshComboData.streakDays

    if (freshComboData.lastQuizDate) {
      const lastDate = new Date(freshComboData.lastQuizDate)
      const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())
      if (lastDay.getTime() === yesterday.getTime()) {
        newStreakDays += 1
      } else if (lastDay.getTime() !== today.getTime()) {
        newStreakDays = 1
      }
    } else {
      newStreakDays = 1
    }

    // 检查经验加成
    const pathPointsData = (user.pathPoints || {}) as Record<string, unknown>
    let expBoostMultiplier = 1.0
    if (pathPointsData.expBoostUntil) {
      const boostEnd = new Date(pathPointsData.expBoostUntil as string)
      if (boostEnd > new Date()) {
        expBoostMultiplier = 1.5
      }
    }

    // 计算经验
    const baseExp = calculateExp(newCombo, isCorrect)
    const expGained = Math.floor(baseExp * expBoostMultiplier)

    // 更新能力值
    const newAbilityScore = calculateAbilityScore(user.abilityScore, isCorrect, question.difficulty, timeTaken)

    // 更新倾向点数
    const currentPathPoints = (user.pathPoints || {}) as Record<string, number>
    const brave = currentPathPoints.brave || 0
    const wise = currentPathPoints.wise || 0
    const tough = currentPathPoints.tough || 0

    let braveGain = 0, wiseGain = 0, toughGain = 0

    if (isCorrect && timeTaken < 10) braveGain += 2 // 快速答对
    if (newCombo >= 5) braveGain += 3 // 高连击

    // 智慧倾向
    if (isCorrect) {
      wiseGain += 1 // 每次答对都加一点
    }
    if (question.type === 'fillblank' && isCorrect) wiseGain += 3 // 填空题答对

    // 坚韧倾向
    if (newStreakDays > freshComboData.streakDays) toughGain += 5 // 连续学习天数+1
    // 完成每日目标检查（简化：每答10题+3）
    if (isCorrect && (user.totalQuiz + 1) % 10 === 0) toughGain += 3

    const newPathPoints = {
      brave: brave + braveGain,
      wise: wise + wiseGain,
      tough: tough + toughGain,
    }

    // 处理升级进化
    const levelUpResult = processLevelUp(
      user.monsterLevel,
      user.monsterExp,
      user.monsterMaxExp,
      expGained
    )

    // 计算金币奖励
    let coinsGained = 0
    if (isCorrect) {
      coinsGained += 2 // 答对1题：+2金币
      if (newCombo >= 3) {
        coinsGained += 5 // 连续答对3题：额外+5金币
      }
    }
    // 每日首次答题：+10金币
    const isFirstQuizToday = !user.lastQuizDate
      || new Date(user.lastQuizDate).toDateString() !== today.toDateString()
    if (isFirstQuizToday) {
      coinsGained += 10
    }

    // 宝箱掉落（15%概率，仅答对时）
    let chestDrop: { type: string; coins: number; label: string } | null = null
    if (isCorrect && Math.random() < 0.15) {
      const rand = Math.random()
      if (rand < 0.05) {
        // 传说宝箱：50-100金币
        const coins = Math.floor(Math.random() * 51) + 50
        chestDrop = { type: 'legendary', coins, label: '传说宝箱' }
        coinsGained += coins
      } else if (rand < 0.30) {
        // 稀有宝箱：20-50金币
        const coins = Math.floor(Math.random() * 31) + 20
        chestDrop = { type: 'rare', coins, label: '稀有宝箱' }
        coinsGained += coins
      } else {
        // 普通宝箱：5-20金币
        const coins = Math.floor(Math.random() * 16) + 5
        chestDrop = { type: 'normal', coins, label: '普通宝箱' }
        coinsGained += coins
      }
    }

    // 开启宝箱增加勇武倾向
    if (chestDrop) braveGain += 1

    // 进化时奖励金币
    if (levelUpResult.isEvolved) {
      coinsGained += EVOLUTION_COIN_REWARD
    }

    // 更新怪兽心情（基于养成属性）
    const decayedHunger = Math.max(0, user.hunger - (user.lastFedAt ? Math.floor((Date.now() - new Date(user.lastFedAt).getTime()) / (1000 * 60 * 60) * 5) : 0))
    const decayedCleanliness = Math.max(0, user.cleanliness - (user.lastCleanedAt ? Math.floor((Date.now() - new Date(user.lastCleanedAt).getTime()) / (1000 * 60 * 60) * 10 / 6) : 0))

    // 答题对饥饿度的影响
    const newHunger = Math.max(0, Math.min(100, decayedHunger + (isCorrect ? 3 : -2)))
    // 答题连击对快乐度的影响
    const happinessBoost = newCombo >= 3 ? 5 : 0
    const newHappiness = Math.max(0, Math.min(100, user.happiness + happinessBoost))

    let newMood = 'happy'
    if (newHunger < 30) newMood = 'tired'
    else if (decayedCleanliness < 30) newMood = 'sad'
    else if (newHappiness < 30) newMood = 'angry'
    else if (newHunger >= 60 && decayedCleanliness >= 60 && newHappiness >= 60 && newCombo >= 3) newMood = 'excited'

    // M1: 多写操作用 $transaction 批量数组形式保证原子性（Neon 支持非交互式批量事务）
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          monsterLevel: levelUpResult.newLevel,
          monsterExp: levelUpResult.newExp,
          monsterMaxExp: levelUpResult.newMaxExp,
          monsterStage: levelUpResult.newStage,
          monsterMood: newMood,
          hunger: newHunger,
          happiness: newHappiness,
          coins: { increment: coinsGained },
          abilityScore: newAbilityScore,
          pathPoints: newPathPoints,
          totalQuiz: { increment: 1 },
          totalCorrect: isCorrect ? { increment: 1 } : undefined,
          combo: newCombo,
          wrongStreak: newWrongStreak,
          maxCombo: Math.max(freshComboData.maxCombo, newCombo),
          streakDays: newStreakDays,
          lastQuizDate: today,
        },
      }),
      prisma.quizRecord.create({
        data: {
          userId,
          questionId,
          isCorrect,
          timeTaken: Math.max(0, Math.min(timeTaken, 3600)),
          expGained,
          comboAtTime: newCombo,
        },
      }),
    ])

    // 记录错题（非阻塞）
    if (!isCorrect && (selectedOption >= 0 || questionType === 'fillblank')) {
      prisma.wrongAnswer.upsert({
        where: { userId_questionId: { userId, questionId } },
        update: {
          wrongCount: { increment: 1 },
          lastWrongAt: new Date(),
          selectedOption: questionType === 'fillblank' ? -1 : selectedOption,
        },
        create: {
          userId,
          questionId,
          subjectId: question.subjectId,
          selectedOption: questionType === 'fillblank' ? -1 : selectedOption,
          correctAnswer: parseInt(question.answer) || 0,
          content: question.content,
          options: question.options,
          wrongCount: 1,
        },
      }).catch((err) => console.error('记录错题失败（非关键）:', err.message))
    }

    // 答对后，如果之前有错题记录，自动标记为已掌握
    if (isCorrect) {
      prisma.wrongAnswer.updateMany({
        where: { userId, questionId, mastered: false },
        data: { mastered: true },
      }).catch((err) => console.error('更新错题状态失败（非关键）:', err.message))
    }

    // 更新每日进度（非阻塞）
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    prisma.dailyProgress.upsert({
      where: { userId_date: { userId, date: todayStr } },
      update: {
        quizCount: { increment: 1 },
        correctCount: isCorrect ? { increment: 1 } : undefined,
        studyMinutes: { increment: Math.max(1, Math.round(timeTaken / 60)) },
      },
      create: {
        userId,
        date: todayStr,
        quizCount: 1,
        correctCount: isCorrect ? 1 : 0,
        studyMinutes: Math.max(1, Math.round(timeTaken / 60)),
      },
    }).then(async (progress) => {
      // 检查是否达成目标
      const plan = await prisma.studyPlan.findUnique({ where: { userId } })
      if (plan && progress.quizCount >= plan.dailyGoal && !progress.goalAchieved) {
        await prisma.dailyProgress.update({
          where: { id: progress.id },
          data: { goalAchieved: true },
        })
      }
    }).catch((err) => console.error('更新每日进度失败（非关键）:', err.message))

    // 检查成就（不阻塞答题响应，成就解锁是附加奖励）
    const newAchievements = await checkAchievements(userId, updatedUser).catch(
      (err) => {
        console.error('成就检查失败（非关键错误）:', err.message)
        return []
      }
    )

    // 更新NPC任务进度（fire-and-forget，不阻塞响应）
    void updateNpcTaskProgress(userId, 'answer_count', 1)
    if (isCorrect) {
      void updateNpcTaskProgress(userId, 'correct_count', 1)
    }

    // 学习小组 v3：更新组内成员进度与小组目标（fire-and-forget，不阻塞响应）
    void updateUserGroupProgress(userId, 1, isCorrect ? 1 : 0)

    // ===== 剧情系统 v2：卡片掉落 + 剧情触发 + 称号检查（非阻塞附加逻辑） =====
    // 设计说明：
    //   - quiz.ts 仅处理 combo/wrongStreak 触发与基础掉落（boss/章节触发与稀有掉落在 story.ts complete 中处理）
    //   - 所有附加逻辑包裹在 try/catch 中，失败仅记录日志，不影响主答题流程
    let droppedCards: DroppedCardInfo[] = []
    let pendingStoryChoices: Array<{
      id: string
      title: string
      description: string
      options: unknown
      triggerType: string
      triggerValue: number
    }> = []
    let unlockedTitles: TitleDef[] = []

    try {
      // 1. 计算并发放卡片掉落（基础掉落：答对30%普通卡，combo>=5 15%史诗卡）
      const droppedRaw = await calculateCardDrop({
        subjectId: question.subjectId,
        isCorrect,
        combo: newCombo,
      })
      if (droppedRaw.length > 0) {
        droppedCards = await dropCardsToUser(userId, droppedRaw)
      }

      // 2. 检测剧情触发（仅 streak_correct / streak_wrong；boss/first_enter 在 story.ts 处理）
      //    为减少 DB 查询，仅当 combo>=5 或 wrongStreak>=3 时才检测
      const triggers: { type: TriggerType; value: number }[] = []
      if (newCombo >= 5) triggers.push({ type: 'streak_correct', value: newCombo })
      if (newWrongStreak >= 3) triggers.push({ type: 'streak_wrong', value: newWrongStreak })
      if (triggers.length > 0) {
        const triggered = await checkStoryTriggers(triggers, userId)
        pendingStoryChoices = triggered.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          options: c.options,
          triggerType: c.triggerType,
          triggerValue: c.triggerValue,
        }))
      }

      // 3. 检查称号解锁（基于最新用户状态）
      unlockedTitles = await checkTitles(userId, updatedUser)
    } catch (err) {
      console.error('[Quiz Submit] 剧情系统附加逻辑失败（非关键）:', err instanceof Error ? err.message : String(err))
    }

    res.json({
      isCorrect,
      correctAnswer: questionType === 'fillblank' ? -1 : parseInt(question.answer),
      correctAnswerText: questionType === 'fillblank' ? question.answer : undefined,
      explanation: question.explanation || undefined,
      expGained,
      coinsGained,
      chestDrop,
      combo: newCombo,
      wrongStreak: newWrongStreak,
      streakDays: newStreakDays,
      newAbilityScore,
      pathPoints: newPathPoints,
      monster: {
        name: updatedUser.monsterName,
        stage: updatedUser.monsterStage,
        stageInfo: EVOLUTION_STAGES[levelUpResult.newStage],
        level: updatedUser.monsterLevel,
        exp: updatedUser.monsterExp,
        maxExp: updatedUser.monsterMaxExp,
        mood: updatedUser.monsterMood,
        hunger: newHunger,
        happiness: newHappiness,
        cleanliness: decayedCleanliness,
        coins: updatedUser.coins,
      },
      levelUp: levelUpResult.isLevelUp
        ? { newLevel: levelUpResult.newLevel }
        : null,
      evolution: levelUpResult.isEvolved
        ? {
            newStage: levelUpResult.newStage,
            stageInfo: EVOLUTION_STAGES[levelUpResult.newStage],
          }
        : null,
      newAchievements: newAchievements.length > 0 ? newAchievements : null,
      // 剧情系统 v2 附加字段
      droppedCards: droppedCards.length > 0 ? droppedCards : null,
      pendingStoryChoices: pendingStoryChoices.length > 0 ? pendingStoryChoices : null,
      unlockedTitles: unlockedTitles.length > 0 ? unlockedTitles : null,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Quiz Submit] 失败:', msg)
    res.status(500).json({ error: '提交答案失败，请稍后重试' })
  }
})

// 获取答题历史
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)

    const [records, total] = await Promise.all([
      prisma.quizRecord.findMany({
        where: { userId: req.userId },
        include: {
          question: {
            select: {
              content: true,
              options: true,
              answer: true,
              subject: { select: { name: true, icon: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quizRecord.count({ where: { userId: req.userId } }),
    ])

    res.json({
      records: records.map((r) => ({
        id: r.id,
        isCorrect: r.isCorrect,
        timeTaken: r.timeTaken,
        expGained: r.expGained,
        comboAtTime: r.comboAtTime,
        createdAt: r.createdAt,
        question: {
          content: r.question.content,
          options: JSON.parse(r.question.options),
          answer: r.question.answer,
          subject: r.question.subject,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取答题历史失败:', error)
    res.status(500).json({ error: '获取答题历史失败' })
  }
})

export default router
