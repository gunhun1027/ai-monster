# AI出题怪兽 - 项目记忆

## 项目概述
- **项目名称**: AI出题怪兽 (ai-monster-quiz)
- **类型**: 学习类应用，通过答题喂养专属怪兽
- **路径**: `h:\project\trae solo\Trae AI创意大赛\ai-monster-quiz`
- **用途**: Trae AI 创意大赛参赛项目

## 技术栈
- **后端**: Node.js + Express + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: JWT + bcryptjs
- **运行环境**: ts-node-dev (开发热重载)
- **前端**: React 18 + TypeScript + Vite + react-router-dom
- **前端样式**: 全局 CSS 变量 + 组件内 `<style>` 标签（无 UI 框架）
- **HTTP**: 原生 fetch 封装（services/api.ts），Bearer Token 鉴权，token 存 localStorage

## 项目结构
```
ai-monster-quiz/
├── client/                        # 前端 React 应用
│   ├── src/
│   │   ├── components/            # 通用组件
│   │   │   ├── AchievementBadge.tsx  # 成就徽章（unlocked/locked 状态）
│   │   │   ├── EvolutionModal.tsx    # 进化弹窗（怪兽进化时）
│   │   │   ├── Header.tsx            # 顶部导航（首页/排行榜/个人中心 + 退出）
│   │   │   ├── Layout.tsx            # 布局壳（Header + main）
│   │   │   ├── MonsterCard.tsx       # 怪兽展示卡（图片/名字/经验/心情/统计）
│   │   │   ├── QuizCard.tsx          # 答题卡（题目+选项+计时+提交）
│   │   │   └── StreakFire.tsx        # 连胜火焰动画（days>=3 跳动 / >=7 变热）
│   │   ├── hooks/
│   │   │   ├── useAuth.ts            # 认证 Hook { user, loading, login, register, logout, updateUser, checkAuth }
│   │   │   └── useGame.ts            # 游戏 Hook { subjects, questions, ranking, achievements, loading, error, fetchSubjects, fetchQuestions, submitAnswer, renameMonster, fetchRanking, fetchAchievements, setError }
│   │   ├── pages/                   # 路由页面
│   │   │   ├── Login.tsx             # 登录/注册页（Tab 切换，径向渐变背景）
│   │   │   ├── Home.tsx              # 主页（三态：选择学科 / 答题中 / 答题结果）
│   │   │   ├── Ranking.tsx           # 排行榜（4 类 Tab：level/streak/correct/combo）
│   │   │   └── Profile.tsx           # 个人中心（统计+成就+答题历史分页）
│   │   ├── services/api.ts           # API 封装：authApi/subjectApi/questionApi/quizApi/monsterApi/rankingApi/achievementApi
│   │   ├── styles/global.css         # 全局样式 + CSS 变量（--primary 等）
│   │   ├── App.tsx                   # 路由根组件（未登录跳 /login）
│   │   ├── main.tsx                  # 入口
│   │   └── types.ts                  # 前端类型定义
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── prisma/
│   │   ├── schema.prisma      # 数据库模型定义
│   │   └── seed.ts            # 种子数据初始化
│   ├── src/
│   │   ├── lib/prisma.ts      # Prisma 客户端单例
│   │   ├── middleware/auth.ts # 认证中间件
│   │   ├── routes/            # 路由模块
│   │   │   ├── achievements.ts
│   │   │   ├── admin.ts
│   │   │   ├── auth.ts
│   │   │   ├── monster.ts
│   │   │   ├── questions.ts
│   │   │   ├── quiz.ts
│   │   │   └── ranking.ts
│   │   ├── utils/             # 工具函数
│   │   │   ├── achievements.ts
│   │   │   ├── evolution.ts
│   │   │   └── jwt.ts
│   │   └── index.ts           # 入口文件
│   ├── .env                   # 环境变量
│   ├── package.json
│   └── tsconfig.json
└── docs/                      # 文档资料
```

## 数据库模型 (Prisma Schema)
- **User**: 用户（含怪兽数据、统计数据、角色）
- **Subject**: 学科
- **Question**: 题目（options 字段为 JSON 字符串）
- **QuizRecord**: 答题记录
- **Achievement**: 成就
- **UserAchievement**: 用户-成就关联
- **SystemConfig**: 系统配置

### 关键字段约定
- `Question.options`: JSON 字符串，格式 `["选项A","选项B","选项C","选项D"]`
- `Question.answer`: 0-3 的索引值
- `Question.difficulty`: 1-5 难度等级
- `User.role`: "user" | "admin"
- `User.monsterStage`: egg | slime | dragon | fire | divine

## 种子数据 (seed.ts)
- **4 个学科**: 英语单词🧠 / 初中数学📐 / 高中历史📜 / 初中语文📖
- **80 道题目**: 每学科 20 道（共 80 道，均为真实题目）
- **7 个成就**: 破壳而出 / 坚持不懈 / 百题斩 / 传说降临 / 连击大师 / 勤学之星 / 龙之进化
- **管理员账号**: admin / admin123 (email: admin@monster.com)
- **3 项系统配置**: announcement / season_active / max_questions_per_round

## 常用命令 (在 server 目录下执行)
- `npm run db:generate` - 生成 Prisma Client
- `npm run db:push` - 同步 schema 到数据库
- `npm run db:seed` - 执行种子数据
- `npm run db:setup` - 一键执行 generate + push + seed
- `npm run db:studio` - 打开 Prisma Studio 可视化管理
- `npm run dev` - 启动开发服务器
- `npm run build` - 编译 TypeScript

## 开发约定
- 使用中文注释
- Prisma 客户端通过 `src/lib/prisma.ts` 单例导出，避免开发模式重复连接
- 种子数据采用 `deleteMany` 清理后重建策略
- 管理员账号密码使用 bcryptjs (saltRounds=10) 加密
- 前端组件样式优先复用 global.css 通用类（.btn/.card/.input/.badge/.progress-bar 等），页面/组件特有样式用 `<style>` 标签内联
- 前端页面统一用函数组件 + Hooks，数据加载放 useEffect，路由跳转用 useNavigate
- 前端 API 请求统一走 services/api.ts，不直接调用 fetch
- 答题结果返回后会更新怪兽信息，需调用 useAuth.updateUser 同步本地 user 状态

## 前端关键约定
### API (services/api.ts)
- `authApi`: register / login / me
- `subjectApi`: list
- `questionApi`: random(subjectId, count=10)
- `quizApi`: submit(questionId, selectedOption, timeTaken) / history(page=1, limit=20)
- `monsterApi`: get / evolution / rename(monsterName)
- `rankingApi`: list(type='level', page=1, limit=50) → { ranking, myRank, pagination }
- `achievementApi`: list
- 全局函数: `setToken(token)` / `clearToken()`

### Hooks
- `useAuth()`: { user, loading, login, register, logout, updateUser, checkAuth }
- `useGame()`: { subjects, questions, ranking, achievements, loading, error, fetchSubjects, fetchQuestions, submitAnswer, renameMonster, fetchRanking, fetchAchievements, setError }
  - 注意: `fetchRanking` 返回 `{ ranking, myRank }`，但 myRank 不在 hook state 中，调用方需自行 useState 保存

### 关键类型 (types.ts)
- `User`: 含 monsterName/monsterStage/monsterLevel/monsterExp/monsterMaxExp/monsterMood/streakDays/combo/maxCombo/totalCorrect/totalQuiz/createdAt
- `QuizResult`: { isCorrect, correctAnswer, expGained, combo, streakDays, monster, levelUp, evolution, newAchievements }
- `RankingItem`: 含 stageEmoji、isMe（用于高亮当前用户）
- `QuizRecord`: 含 question.content/options/answer/subject.{name,icon}

### 路由 (App.tsx)
- `/login` → Login（未登录强制跳转）
- `/` → Home
- `/ranking` → Ranking
- `/profile` → Profile
- 已登录包裹在 Layout 内（含 Header）

### 资源路径
- Logo: `/assets/logo/logo-256.png`
- 怪兽图片: `/assets/monsters/monster-{egg|slime|dragon|fire|divine}.png`

### CSS 变量速查
- 主题色: `--primary`(#6c5ce7) / `--primary-light`(#a29bfe) / `--secondary` / `--accent`(#fdcb6e)
- 状态色: `--success`(#00b894) / `--danger`(#e17055) / `--warning` / `--info`
- 渐变: `--gradient-primary` / `--gradient-secondary` / `--gradient-success`
- 阴影: `--shadow-sm` / `--shadow` / `--shadow-lg` / `--shadow-primary`
- 圆角: `--radius-sm`(8px) / `--radius`(12px) / `--radius-lg`(16px) / `--radius-xl`(24px)

## 待办 / 后续
- [x] 前端 React 应用已搭建（client 目录）
- [x] 4 个核心页面已完成：Login / Home / Ranking / Profile
- [ ] 实际运行种子前需配置 `.env` 中的 DATABASE_URL
- [ ] 可补充：管理员后台页面（server 已有 admin 路由）
- [ ] 可补充：移动端深度适配测试
