# AI出题怪兽 - TRAE AI创造力大赛参赛作品

## 项目简介

**AI出题怪兽** 是一个将RPG怪兽养成游戏与学科学习深度融合的互动学习平台。通过"答题喂养怪兽"的创新方式，让学习像打游戏一样上瘾。

- **参赛赛道**：学习工作赛道
- **参赛工具**：TRAE IDE + TRAE Work
- **技术栈**：React + TypeScript + Node.js + Express + Prisma + PostgreSQL

---

## 核心功能

### 怪兽养成系统
- 5个进化阶段：神秘蛋 🥚 → 小史莱姆 🟢 → 幼龙 🐉 → 火焰巨龙 🔥 → 传说神兽 ✨
- 心情系统：开心 😊 / 普通 😐 / 饥饿 😢
- 怪兽自定义命名

### 智能答题系统
- AI智能出题（覆盖英语单词、初中数学、高中历史、初中语文4个学科）
- 30秒倒计时答题
- 答对+经验，答错给提示
- 连击Combo加成系统

### 上瘾机制设计
- **可变奖励**：普通/稀有/史诗/传说食物随机掉落
- **连胜系统**：每日签到保持连胜，断连归零
- **成就系统**：7个成就待解锁
- **排行榜**：全服排名PK

### 用户系统
- 注册/登录
- 个人中心（怪兽详情、统计数据、成就展示）
- 答题历史记录

### 管理后台（API已完成）
- 数据统计面板
- 用户管理
- 题目管理（CRUD）
- 学科管理

---

## 项目结构

```
ai-monster-quiz/
├── server/               # 后端（Node.js + Express）
│   ├── src/
│   │   ├── index.ts      # Express入口
│   │   ├── prisma/       # 数据库模型
│   │   ├── routes/       # API路由
│   │   ├── middleware/   # 中间件
│   │   └── utils/        # 工具函数
│   └── package.json
├── client/               # 前端（React + Vite）
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 公共组件
│   │   ├── hooks/        # 自定义Hooks
│   │   ├── services/     # API封装
│   │   └── styles/       # 全局样式
│   └── package.json
├── vercel.json           # Vercel部署配置
└── README.md             # 项目说明
```

---

## 数据库模型

| 表名 | 说明 |
|------|------|
| User | 用户（含怪兽数据、统计数据） |
| Subject | 学科 |
| Question | 题目 |
| QuizRecord | 答题记录 |
| Achievement | 成就 |
| UserAchievement | 用户成就关联 |
| SystemConfig | 系统配置 |

---

## 安装与运行

### 环境要求
- Node.js 18+
- PostgreSQL 14+

### 1. 克隆项目
```bash
git clone <项目地址>
cd ai-monster-quiz
```

### 2. 安装依赖
```bash
# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install
```

### 3. 配置环境变量
```bash
cd ../server
cp .env.example .env
```

编辑 `.env` 文件：
```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/ai_monster_quiz"
JWT_SECRET="your-jwt-secret-key"
PORT=3000
```

### 4. 初始化数据库
```bash
npx prisma db push
npx prisma db seed
```

### 5. 启动开发服务器
```bash
# 启动后端
cd server && npm run dev

# 新终端启动前端
cd client && npm run dev
```

---

## 部署到Vercel

### 1. 准备环境变量
在Vercel Dashboard中添加：
- `DATABASE_URL`：PostgreSQL连接字符串
- `JWT_SECRET`：JWT密钥

### 2. 部署
```bash
vercel --prod
```

---

## API文档

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| GET | /api/auth/me | 获取当前用户 |

### 题目
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/subjects | 学科列表 |
| GET | /api/questions/random | 随机题目 |
| POST | /api/quiz/submit | 提交答案 |
| GET | /api/quiz/history | 答题历史 |

### 怪兽
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/monster | 怪兽数据 |
| PUT | /api/monster/name | 重命名怪兽 |
| GET | /api/ranking | 排行榜 |
| GET | /api/achievements | 成就列表 |

### 管理后台
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/stats | 数据统计 |
| GET/PUT/DELETE | /api/admin/users/:id | 用户管理 |
| GET/POST/PUT/DELETE | /api/admin/questions | 题目管理 |

---

## 技术亮点

- **行为心理学设计**：基于斯金纳箱可变奖励原理、损失厌恶、情感绑定
- **前后端分离**：React + Express 完整架构
- **类型安全**：全TypeScript开发
- **数据库设计**：Prisma ORM + PostgreSQL，关系模型完整
- **安全**：bcrypt密码加密 + JWT认证

---

## 参赛信息

- **大赛**：TRAE AI创造力大赛 2026
- **赛道**：学习工作赛道
- **开发工具**：TRAE IDE
