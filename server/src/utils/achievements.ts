// 成就检查系统
import { Prisma, User } from '@prisma/client'
import { prisma } from '../lib/prisma'

interface NewlyUnlockedAchievement {
  id: string
  name: string
  icon: string
  description: string
}

// 成就解锁条件检查
export async function checkAchievements(userId: string, user: User) {
  const allAchievements = await prisma.achievement.findMany()
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  })
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId))

  const newlyUnlocked: NewlyUnlockedAchievement[] = []

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue

    const isUnlocked = checkCondition(achievement.condition, achievement.threshold, user)

    if (isUnlocked) {
      newlyUnlocked.push({
        id: achievement.id,
        name: achievement.name,
        icon: achievement.icon,
        description: achievement.description,
      })
    }
  }

  if (newlyUnlocked.length > 0) {
    await prisma.userAchievement.createMany({
      data: newlyUnlocked.map((a) => ({
        userId,
        achievementId: a.id,
      })),
      skipDuplicates: true, // 跳过 @@unique([userId, achievementId]) 冲突，避免整体 P2002 失败
    })
  }

  return newlyUnlocked
}

// 检查单个成就条件
function checkCondition(condition: string, threshold: number, user: User): boolean {
  switch (condition) {
    case 'first_quiz':
      return user.totalQuiz >= 1
    case 'streak_7':
      return user.streakDays >= 7
    case 'total_correct_100':
      return user.totalCorrect >= 100
    case 'monster_divine':
      return user.monsterStage === 'divine'
    case 'combo_10':
      return user.maxCombo >= 10
    case 'total_quiz_50':
      return user.totalQuiz >= 50
    case 'monster_level_30':
      return user.monsterLevel >= 30
    default:
      return false
  }
}
