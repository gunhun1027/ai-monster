// 怪兽进化系统

// 进化阶段配置
export const EVOLUTION_STAGES = {
  egg: {
    name: '神秘蛋',
    emoji: '🥚',
    image: '/assets/monsters/monster-egg.svg',
    minLevel: 1,
    maxLevel: 4,
    expPerLevel: 100,
    description: '一颗神秘的蛋，似乎有什么东西在里面蠢蠢欲动...',
  },
  slime: {
    name: '小史莱姆',
    emoji: '🟢',
    image: '/assets/monsters/monster-slime.svg',
    minLevel: 5,
    maxLevel: 14,
    expPerLevel: 120,
    description: '破壳而出的小史莱姆，软绵绵的非常可爱。',
  },
  dragon: {
    name: '幼龙',
    emoji: '🐉',
    image: '/assets/monsters/monster-dragon.svg',
    minLevel: 15,
    maxLevel: 29,
    expPerLevel: 150,
    description: '长出翅膀的幼龙，开始展现出力量。',
  },
  fire: {
    name: '火焰巨龙',
    emoji: '🔥',
    image: '/assets/monsters/monster-fire.svg',
    minLevel: 30,
    maxLevel: 49,
    expPerLevel: 180,
    description: '威严的火焰巨龙，周身燃烧着炽热火焰。',
  },
  divine: {
    name: '传说神兽',
    emoji: '✨',
    image: '/assets/monsters/monster-divine.svg',
    minLevel: 50,
    maxLevel: 999,
    expPerLevel: 200,
    description: '传说中的神兽，拥有无与伦比的力量。',
  },
} as const

export type MonsterStage = keyof typeof EVOLUTION_STAGES

// 根据等级获取怪兽阶段
export function getStageByLevel(level: number): MonsterStage {
  if (level >= 50) return 'divine'
  if (level >= 30) return 'fire'
  if (level >= 15) return 'dragon'
  if (level >= 5) return 'slime'
  return 'egg'
}

// 计算经验值
// 基础经验20，经验公式：baseExp * (1 + combo * 0.1)，combo上限10倍
export function calculateExp(combo: number, isCorrect: boolean): number {
  if (!isCorrect) return 0
  const baseExp = 20
  const comboMultiplier = 1 + Math.min(combo, 10) * 0.1
  return Math.floor(baseExp * comboMultiplier)
}

// 升级和进化计算
export interface LevelUpResult {
  newLevel: number
  newExp: number
  newMaxExp: number
  newStage: MonsterStage
  isLevelUp: boolean
  isEvolved: boolean
}

export function processLevelUp(
  currentLevel: number,
  currentExp: number,
  currentMaxExp: number,
  gainedExp: number
): LevelUpResult {
  let newLevel = currentLevel
  let newExp = currentExp + gainedExp
  let newMaxExp = currentMaxExp
  const oldStage = getStageByLevel(currentLevel)
  let isLevelUp = false

  // 处理升级
  while (newExp >= newMaxExp) {
    newExp -= newMaxExp
    newLevel += 1
    isLevelUp = true
    const newStage = getStageByLevel(newLevel)
    newMaxExp = EVOLUTION_STAGES[newStage].expPerLevel
  }

  const newStage = getStageByLevel(newLevel)
  const isEvolved = newStage !== oldStage

  return {
    newLevel,
    newExp,
    newMaxExp,
    newStage,
    isLevelUp,
    isEvolved,
  }
}

// 进化时奖励金币
export const EVOLUTION_COIN_REWARD = 50

// 获取进化配置表
export function getEvolutionConfig() {
  return Object.entries(EVOLUTION_STAGES).map(([key, stage]) => ({
    stage: key,
    ...stage,
  }))
}

// 进化分支配置
export const EVOLUTION_BRANCHES: Record<string, {
  name: string
  stages: Record<string, { name: string; emoji: string; image: string; description?: string }>
}> = {
  brave: {
    name: '勇武之路',
    stages: {
      egg: { name: '战斗蛋', emoji: '🥚', image: '/assets/monsters/monster-egg.svg', description: '一颗充满战意的蛋' },
      slime: { name: '烈焰史莱姆', emoji: '🔴', image: '/assets/monsters/monster-slime.svg' },
      dragon: { name: '雷霆幼龙', emoji: '⚡', image: '/assets/monsters/monster-dragon.svg' },
      fire: { name: '烈焰龙王', emoji: '🔥', image: '/assets/monsters/monster-fire.svg' },
      divine: { name: '战神兽', emoji: '⚔️', image: '/assets/monsters/monster-divine.svg' },
    }
  },
  wise: {
    name: '智慧之路',
    stages: {
      egg: { name: '智慧蛋', emoji: '🥚', image: '/assets/monsters/monster-egg.svg', description: '一颗散发微光的蛋' },
      slime: { name: '星光史莱姆', emoji: '🔵', image: '/assets/monsters/monster-slime.svg' },
      dragon: { name: '水晶幼龙', emoji: '💎', image: '/assets/monsters/monster-dragon.svg' },
      fire: { name: '星龙王', emoji: '✨', image: '/assets/monsters/monster-fire.svg' },
      divine: { name: '智神兽', emoji: '📖', image: '/assets/monsters/monster-divine.svg' },
    }
  },
  tough: {
    name: '坚韧之路',
    stages: {
      egg: { name: '坚韧蛋', emoji: '🥚', image: '/assets/monsters/monster-egg.svg', description: '一颗坚如磐石的蛋' },
      slime: { name: '岩石史莱姆', emoji: '🟤', image: '/assets/monsters/monster-slime.svg' },
      dragon: { name: '钢铁幼龙', emoji: '🛡️', image: '/assets/monsters/monster-dragon.svg' },
      fire: { name: '大地龙王', emoji: '🌋', image: '/assets/monsters/monster-fire.svg' },
      divine: { name: '守护神兽', emoji: '🏔️', image: '/assets/monsters/monster-divine.svg' },
    }
  }
}

// CSS filter for branch themes
export const BRANCH_CSS_FILTERS: Record<string, string> = {
  brave: 'hue-rotate(0deg) brightness(1.1)',
  wise: 'hue-rotate(200deg) brightness(1.2)',
  tough: 'hue-rotate(40deg) brightness(0.9)',
}

// Get branch-specific stage info
export function getBranchStageInfo(branch: string | null, stage: string) {
  if (branch && EVOLUTION_BRANCHES[branch]) {
    return EVOLUTION_BRANCHES[branch].stages[stage] || null
  }
  return null
}

// Calculate ability score change
export function calculateAbilityScore(currentScore: number, isCorrect: boolean, questionDifficulty: number, timeTaken: number): number {
  const baseChange = isCorrect ? 2 : -2
  const difficultyBonus = questionDifficulty * 0.5
  const speedBonus = timeTaken < 10 ? 1 : 0
  let change = baseChange + (isCorrect ? difficultyBonus + speedBonus : -difficultyBonus)
  change = Math.max(-5, Math.min(5, change))
  return Math.max(0, Math.min(100, currentScore + change))
}

// Select question difficulty based on ability score
export function selectQuestionDifficulty(abilityScore: number): number {
  if (abilityScore <= 20) return 1
  if (abilityScore <= 40) return 2
  if (abilityScore <= 60) return 3
  if (abilityScore <= 80) return 4
  return 5
}

// Path point rules
export interface PathPoints {
  brave: number
  wise: number
  tough: number
}

export function getPathPointsRecommendation(points: PathPoints): string {
  const max = Math.max(points.brave, points.wise, points.tough)
  if (max === 0) return 'brave' // default
  if (points.brave >= points.wise && points.brave >= points.tough) return 'brave'
  if (points.wise >= points.brave && points.wise >= points.tough) return 'wise'
  return 'tough'
}
