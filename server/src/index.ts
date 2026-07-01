// AI出题怪兽 - 后端服务入口
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'

// 路由
import authRoutes from './routes/auth'
import subjectRoutes from './routes/subjects'
import questionRoutes from './routes/questions'
import quizRoutes from './routes/quiz'
import monsterRoutes from './routes/monster'
import rankingRoutes from './routes/ranking'
import achievementRoutes from './routes/achievements'
import adminRoutes from './routes/admin'
import rewardsRoutes from './routes/rewards'
import wrongAnswerRoutes from './routes/wronganswers'
import analyticsRoutes from './routes/analytics'
import studyPlanRoutes from './routes/studyplan'
import shopRoutes from './routes/shop'
import challengeRoutes from './routes/challenge'
import aiQuestionRoutes from './routes/aiQuestions'
import storyRoutes from './routes/story'
import npcRoutes from './routes/npc'
import cardsRoutes from './routes/cards'
import userRoutes from './routes/user'
import groupRoutes from './routes/groups'

const app = express()
const PORT = process.env.PORT || 3000

// Vercel 反向代理：信任代理头（限流正确识别用户IP必需）
app.set('trust proxy', 1)

// CORS：支持多域名（开发环境 + 生产环境）
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim())
app.use(cors({
  origin: (origin, callback) => {
    // origin 为 undefined 时是服务端对服务端请求，允许通过
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`), false)
    }
  },
  credentials: true,
}))

// HTTP安全头部（X-Frame-Options, CSP, X-Content-Type-Options等）
app.use(helmet({
  // 允许内联样式（前端组件中使用了 styled-jsx 风格的 <style> 标签）
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

// ===== 限流策略：按路由分组精细化配置 =====

// 1. 登录注册严格限流（20次/15分钟，仅失败请求计数 → 防暴力破解）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 登录成功不计入，只有失败才计数
  message: { error: '登录尝试次数过多，请15分钟后再试' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// 2. AI 生成严格限流（30次/15分钟，调用 AI API 有成本，需严格保护）
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI生成请求过于频繁，请稍后再试' },
})
app.use('/api/ai-questions', aiLimiter)

// 3. 读接口宽松限流（1000次/15分钟，正常浏览远低于此）
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
})
app.use('/api/subjects', readLimiter)
app.use('/api/questions', readLimiter)
app.use('/api/ranking', readLimiter)
app.use('/api/achievements', readLimiter)
app.use('/api/analytics', readLimiter)
app.use('/api/cards', readLimiter)

// 4. 写接口中等限流（500次/15分钟，正常答题+操作远低于此，仍能拦截脚本刷接口）
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
})
// 覆盖混合接口（含读+写）以及纯写接口；/api/auth 整体用 writeLimiter 覆盖 /me 等其他端点
// 注意：/api/auth/login 和 /api/auth/register 会先经过 authLimiter 再经过 writeLimiter（双计数，但 writeLimiter 阈值高，不影响正常使用）
app.use('/api/auth', writeLimiter)
app.use('/api/quiz', writeLimiter)
app.use('/api/monster', writeLimiter)
app.use('/api/rewards', writeLimiter)
app.use('/api/wrong-answers', writeLimiter)
app.use('/api/study-plan', writeLimiter)
app.use('/api/shop', writeLimiter)
app.use('/api/challenges', writeLimiter)
app.use('/api/story', writeLimiter)
app.use('/api/npc', writeLimiter)
app.use('/api/user', writeLimiter)
app.use('/api/admin', writeLimiter)
app.use('/api/groups', writeLimiter)

// 请求体大小限制（防止超大请求导致内存溢出）
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务（图片等资源）
app.use('/assets', express.static(path.join(__dirname, '../../assets')))
// 前端public资源（favicon等）
app.use('/assets', express.static(path.join(__dirname, '../../client/public/assets')))

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API路由 - 明确分离
app.use('/api/auth', authRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/quiz', quizRoutes)
app.use('/api/monster', monsterRoutes)
app.use('/api/ranking', rankingRoutes)
app.use('/api/achievements', achievementRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/rewards', rewardsRoutes)
app.use('/api/wrong-answers', wrongAnswerRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/study-plan', studyPlanRoutes)
app.use('/api/shop', shopRoutes)
app.use('/api/challenges', challengeRoutes)
app.use('/api/ai-questions', aiQuestionRoutes)
app.use('/api/story', storyRoutes)
app.use('/api/npc', npcRoutes)
app.use('/api/cards', cardsRoutes)
app.use('/api/user', userRoutes)
app.use('/api/groups', groupRoutes)

// 全局错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err.message)
  res.status(500).json({ error: '服务器内部错误，请稍后重试' })
})

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// 启动服务
// 全局兜底：捕获 fire-and-forget 等未处理的 Promise 拒绝与未捕获异常，避免进程崩溃
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err)
})

// Vercel Serverless 兼容导出
export default app

// 本地开发时启动 HTTP 服务
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 后端服务已启动: http://localhost:${PORT}`)
    console.log(`📋 健康检查: http://localhost:${PORT}/api/health`)
    console.log(`🗄️  数据库: PostgreSQL (Neon)\n`)
    console.log(`🛡️  安全中间件: helmet + 分组限流已启用`)
    console.log(`   • 认证接口: 20次/15min（仅失败计数）`)
    console.log(`   • AI 生成: 30次/15min`)
    console.log(`   • 读接口: 1000次/15min`)
    console.log(`   • 写接口: 500次/15min\n`)
  })
}
