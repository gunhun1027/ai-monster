// 认证路由 - 注册/登录
import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import type { User } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { generateToken } from '../utils/jwt'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 用户注册
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body

    // 参数校验
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码不能为空' })
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度需2-20个字符' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' })
    }

    // 检查用户名和邮箱是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    })
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: '用户名已被注册' })
      }
      return res.status(400).json({ error: '邮箱已被注册' })
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    })

    // 生成token
    const token = generateToken({ userId: user.id, role: user.role })

    res.status(201).json({
      token,
      user: formatUserResponse(user),
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json({ error: '用户名或邮箱已被注册' })
    }
    console.error('注册失败:', error)
    res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

// 用户登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
    })

    if (!user) {
      return res.status(400).json({ error: '用户名或密码错误' })
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return res.status(400).json({ error: '用户名或密码错误' })
    }

    // 生成token
    const token = generateToken({ userId: user.id, role: user.role })

    res.json({
      token,
      user: formatUserResponse(user),
    })
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// 获取当前用户信息
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    })

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ user: formatUserResponse(user) })
  } catch (error) {
    console.error('获取用户信息失败:', error)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

// 格式化用户响应（去除敏感信息）
function formatUserResponse(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    monsterName: user.monsterName,
    monsterStage: user.monsterStage,
    monsterLevel: user.monsterLevel,
    monsterExp: user.monsterExp,
    monsterMaxExp: user.monsterMaxExp,
    monsterMood: user.monsterMood,
    hunger: user.hunger,
    cleanliness: user.cleanliness,
    happiness: user.happiness,
    coins: user.coins,
    streakDays: user.streakDays,
    lastQuizDate: user.lastQuizDate,
    totalCorrect: user.totalCorrect,
    totalQuiz: user.totalQuiz,
    combo: user.combo,
    maxCombo: user.maxCombo,
    createdAt: user.createdAt,
    // 剧情系统 v2 字段
    storyRoute: user.storyRoute,
    title: user.title,
    cardCollectionCount: user.cardCollectionCount,
    wrongStreak: user.wrongStreak,
  }
}

export default router
