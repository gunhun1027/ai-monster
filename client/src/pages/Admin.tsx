// 管理后台页面 - 数据统计 / 用户管理 / 题目管理 / 学科管理
import { useState, useEffect, useRef, useCallback } from 'react'
import { adminApi } from '../services/api'
import type {
  AdminStats,
  AdminUser,
  Pagination,
  AdminQuestion,
  Subject,
  SubjectDistribution,
  AddQuestionRequest,
  UpdateQuestionRequest,
} from '../types'

// 管理后台学科类型（扩展 Subject，含启用状态和创建时间）
interface AdminSubject extends Subject {
  isActive: boolean
  createdAt: string
}

// 题目保存数据类型（answer 兼容选择题 number 和填空题 string）
interface QuestionSaveData {
  subjectId: string
  content: string
  type: string
  explanation?: string
  tags?: string[]
  difficulty: number
  options?: string[]
  answer?: number | string
}

// 左侧导航 Tab 类型
type TabKey = 'dashboard' | 'users' | 'questions' | 'subjects'

// 左侧导航配置
const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: '数据统计' },
  { key: 'users', label: '用户管理' },
  { key: 'questions', label: '题目管理' },
  { key: 'subjects', label: '学科管理' },
]

// 垂直滑动指示器Hook（基于距离恒定速度）
function useVerticalIndicator(
  containerRef: React.RefObject<HTMLElement>,
  activeIndex: number,
  itemSelector: string
) {
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 })
  const [indicatorDuration, setIndicatorDuration] = useState('0.5s')
  const prevTopRef = useRef(0)
  const rafId = useRef<number>(0)

  const updateIndicator = useCallback(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const items = container.querySelectorAll<HTMLElement>(itemSelector)
    const activeItem = items[activeIndex]
    if (!activeItem) return
    const parentRect = container.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const newTop = itemRect.top - parentRect.top
    // 基于距离计算持续时间，保持恒定速度
    const distance = Math.abs(newTop - prevTopRef.current)
    const duration = Math.max(0.25, Math.min(0.6, distance / 500))
    setIndicatorDuration(`${duration}s`)
    prevTopRef.current = newTop
    setIndicatorStyle({
      top: newTop,
      height: itemRect.height,
    })
  }, [containerRef, activeIndex, itemSelector])

  useEffect(() => {
    updateIndicator()
    const handler = () => {
      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(updateIndicator)
    }
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('resize', handler)
      cancelAnimationFrame(rafId.current)
    }
  }, [updateIndicator])

  return { indicatorStyle, indicatorDuration }
}

// 格式化日期为 YYYY-MM-DD
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 渲染难度星级（1-5）
function renderStars(difficulty: number): string {
  const d = Math.max(1, Math.min(5, difficulty || 1))
  return '★'.repeat(d) + '☆'.repeat(5 - d)
}

// Toast 回调类型
type ToastFn = (msg: string, type?: 'success' | 'error') => void

export default function Admin() {
  // 当前激活的 Tab
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  // 全局提示信息
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  // 侧边栏ref，用于滑动指示器
  const sidebarRef = useRef<HTMLElement>(null)
  // 激活tab索引
  const activeIndex = TABS.findIndex(t => t.key === activeTab)
  // 垂直指示器样式
  const { indicatorStyle, indicatorDuration } = useVerticalIndicator(sidebarRef, activeIndex, '.admin-nav-item')

  // 显示提示（2.5s 后自动消失）
  const showToast: ToastFn = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="admin-page">
      {/* 顶部标题 + 欢迎语 */}
      <div className="admin-top">
        <h1 className="admin-title">管理后台</h1>
        <p className="admin-welcome">欢迎回来，管理员！在这里管理你的怪兽学习应用</p>
      </div>

      {/* 主体：左侧导航 + 右侧内容 */}
      <div className="admin-layout">
        {/* 左侧导航栏 */}
        <nav ref={sidebarRef} className="admin-sidebar vertical-sliding-tabs">
          {/* 垂直滑动指示器 */}
          <div
            className="vertical-sliding-indicator"
            style={{
              top: indicatorStyle.top,
              height: indicatorStyle.height,
              transition: `top ${indicatorDuration} var(--ease-spring), height ${indicatorDuration} var(--ease-spring), background 0.3s var(--ease-slide)`,
            }}
          />
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={'admin-nav-item' + (activeTab === tab.key ? ' active' : '')}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 右侧内容区域 */}
        <div className="admin-content">
          {activeTab === 'dashboard' && <DashboardPanel onToast={showToast} />}
          {activeTab === 'users' && <UsersPanel onToast={showToast} />}
          {activeTab === 'questions' && <QuestionsPanel onToast={showToast} />}
          {activeTab === 'subjects' && <SubjectsPanel onToast={showToast} />}
        </div>
      </div>

      {/* 全局 Toast 提示 */}
      {toast && (
        <div className={'admin-toast ' + toast.type}>
          {toast.msg}
        </div>
      )}

      <style>{`
        .admin-page { width: 100%; }
        .admin-top { margin-bottom: 20px; }
        .admin-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .admin-welcome {
          color: var(--text-secondary);
          margin-top: 4px;
          font-size: 14px;
        }
        /* 主体布局：左导航 + 右内容 */
        .admin-layout {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 20px;
          align-items: start;
        }
        /* 左侧导航 - 垂直滑动胶囊 */
        .admin-sidebar {
          display: flex;
          flex-direction: column;
          gap: 0;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: 6px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          position: sticky;
          top: 88px;
        }
        .admin-nav-item {
          position: relative;
          z-index: 1;
          text-align: left;
          padding: 12px 16px;
          border-radius: var(--radius);
          font-size: 15px;
          font-weight: 600;
          color: var(--text-secondary);
          background: transparent;
          transition: color var(--duration-slide) var(--ease-slide);
          border: none;
          cursor: pointer;
        }
        .admin-nav-item:hover {
          color: var(--text-primary);
        }
        .admin-nav-item.active {
          color: white;
        }
        /* 右侧内容 */
        .admin-content { min-width: 0; }
        .admin-loading, .admin-empty {
          padding: 40px 16px;
          text-align: center;
          color: var(--text-secondary);
        }
        /* 工具栏 */
        .admin-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .toolbar-title {
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
        }
        .admin-search-input {
          flex: 1;
          min-width: 200px;
          max-width: 400px;
        }
        .admin-select { max-width: 220px; }
        /* 统计卡片 2x2 - 无彩色边框 */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-xs);
        }
        .stat-card-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--bg-muted);
          color: var(--text-secondary);
        }
        .stat-card-body { flex: 1; }
        .stat-card-value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
        .stat-card-label { font-size: 14px; color: var(--text-secondary); margin-top: 2px; }
        .today-new-users {
          padding: 12px 18px;
          background: var(--bg-muted);
          border-radius: var(--radius);
          color: var(--text-primary);
          font-size: 14px;
          margin-bottom: 20px;
          font-weight: 600;
          border: 1px solid var(--border);
        }
        /* 表格卡片 */
        .admin-table-card {
          padding: 0;
          overflow: hidden;
        }
        .panel-section-title {
          font-size: 18px;
          font-weight: 700;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
        }
        .table-wrap { overflow-x: auto; }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .admin-table th {
          text-align: left;
          padding: 12px 16px;
          background: var(--bg-muted);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 13px;
          white-space: nowrap;
          border-bottom: 1px solid var(--border);
        }
        .admin-table th:first-child { padding-left: 20px; }
        .admin-table td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
          vertical-align: middle;
        }
        .admin-table td:first-child { padding-left: 20px; }
        .admin-table tbody tr { transition: background 0.15s; }
        .admin-table tbody tr:hover { background: var(--bg-hover); }
        .admin-table tbody tr:last-child td { border-bottom: none; }
        /* 表格单元格 */
        .content-cell {
          max-width: 320px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .email-cell { color: var(--text-secondary); font-size: 13px; }
        .date-cell { color: var(--text-secondary); font-size: 13px; white-space: nowrap; }
        .icon-cell { font-size: 22px; text-align: center; }
        .name-cell { font-weight: 600; }
        .desc-cell {
          max-width: 240px;
          color: var(--text-secondary);
          font-size: 13px;
        }
        .stars-cell {
          color: var(--warning);
          letter-spacing: 2px;
          white-space: nowrap;
        }
        .user-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .user-name { font-weight: 600; }
        .monster-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 13px;
        }
        .accuracy.good { color: var(--success); font-weight: 600; }
        .accuracy.low { color: var(--danger); font-weight: 600; }
        .subject-tag { white-space: nowrap; }
        .action-cell {
          display: flex;
          gap: 6px;
          white-space: nowrap;
        }
        .admin-action-btn {
          padding: 6px 12px;
          font-size: 13px;
          border-radius: var(--radius-sm);
        }
        /* 分页 */
        .admin-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
        }
        .admin-page-btn { padding: 8px 16px; font-size: 14px; }
        .page-info {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        /* 弹窗 */
        .admin-modal-mask {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--text-primary) 40%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .admin-modal {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
        }
        .admin-modal-sm { max-width: 400px; }
        .admin-modal-wide { max-width: 600px; }
        .admin-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border);
        }
        .admin-modal-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .modal-close {
          background: transparent;
          font-size: 24px;
          line-height: 1;
          color: var(--text-secondary);
          padding: 0 4px;
          border: none;
          cursor: pointer;
        }
        .modal-close:hover { color: var(--text-primary); }
        .admin-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .admin-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }
        /* 表单 */
        .form-group { margin-bottom: 18px; }
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .admin-textarea {
          resize: vertical;
          font-family: inherit;
        }
        .form-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 6px;
        }
        /* 选项输入 */
        .options-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .option-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .option-radio {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid var(--border);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s, background 0.15s;
        }
        .option-radio.checked {
          border-color: var(--success);
          background: var(--success);
        }
        .option-radio input { display: none; }
        .option-letter {
          font-weight: 700;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .option-radio.checked .option-letter { color: white; }
        .option-row .input { flex: 1; }
        /* 难度选择 */
        .difficulty-picker {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .difficulty-star {
          background: transparent;
          font-size: 28px;
          color: var(--border);
          transition: color 0.15s;
          padding: 2px;
          border: none;
          cursor: pointer;
        }
        .difficulty-star.active { color: var(--warning); }
        .difficulty-text {
          margin-left: 12px;
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        /* 删除确认 */
        .confirm-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .confirm-content {
          margin-top: 12px;
          padding: 12px;
          background: var(--bg-muted);
          border-radius: var(--radius);
          color: var(--text-primary);
          font-size: 14px;
        }
        .confirm-warn {
          margin-top: 12px;
          font-size: 13px;
          color: var(--danger);
        }
        /* Toast */
        .admin-toast {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: var(--radius);
          color: white;
          font-weight: 600;
          font-size: 14px;
          z-index: 2000;
          box-shadow: var(--shadow);
        }
        .admin-toast.success { background: var(--success); }
        .admin-toast.error { background: var(--danger); }
        /* 响应式 */
        @media (max-width: 768px) {
          .admin-layout { grid-template-columns: 1fr; }
          .admin-sidebar {
            position: static;
            flex-direction: row;
            overflow-x: auto;
          }
          .admin-nav-item { white-space: nowrap; }
          .stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

// ===== 1. 数据统计模块 =====
function DashboardPanel({ onToast }: { onToast: ToastFn }) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载统计数据
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await adminApi.stats()
        setStats(res.stats)
      } catch (err) {
        onToast('加载统计数据失败', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div className="admin-loading">加载中...</div>
  if (!stats) return <div className="admin-empty">暂无数据</div>

  // 4 个统计卡片配置
  const cards = [
    { label: '总用户数', value: stats.totalUsers, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )},
    { label: '今日活跃', value: stats.todayActiveUsers, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    )},
    { label: '总答题量', value: stats.totalQuizRecords, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    )},
    { label: '题目总数', value: stats.totalQuestions, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    )},
  ]

  return (
    <div className="dashboard-panel">
      {/* 统计卡片 2x2 网格 */}
      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className="stat-card-icon">{c.icon}</div>
            <div className="stat-card-body">
              <div className="stat-card-value">{c.value}</div>
              <div className="stat-card-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 今日新增用户 */}
      <div className="today-new-users">
        今日新增用户：<strong>{stats.todayNewUsers}</strong>
      </div>

      {/* 学科分布表格 */}
      <div className="card admin-table-card">
        <h3 className="panel-section-title">学科分布</h3>
        {stats.subjectDistribution && stats.subjectDistribution.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>学科名称</th>
                  <th>图标</th>
                  <th>题目数量</th>
                </tr>
              </thead>
              <tbody>
                {stats.subjectDistribution.map((s: SubjectDistribution, i: number) => (
                  <tr key={i}>
                    <td className="name-cell">{s.name}</td>
                    <td className="icon-cell">{s.icon}</td>
                    <td><span className="badge badge-primary">{s.count} 题</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">暂无学科数据</div>
        )}
      </div>
    </div>
  )
}

// ===== 2. 用户管理模块 =====
function UsersPanel({ onToast }: { onToast: ToastFn }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  // 搜索相关
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  // 编辑弹窗
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ monsterLevel: 0, streakDays: 0, totalCorrect: 0 })
  const [saving, setSaving] = useState(false)

  // 加载用户列表
  const loadUsers = async (page: number = 1, searchText: string = search) => {
    try {
      setLoading(true)
      const res = await adminApi.users(page, 20, searchText)
      setUsers(res.users)
      setPagination(res.pagination)
    } catch (err) {
      onToast('加载用户列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 首次加载
  useEffect(() => {
    loadUsers(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 点击搜索
  const handleSearch = () => {
    setSearch(searchInput)
    loadUsers(1, searchInput)
  }

  // 打开编辑弹窗
  const openEdit = (user: AdminUser) => {
    setEditUser(user)
    setEditForm({
      monsterLevel: user.monsterLevel,
      streakDays: user.streakDays,
      totalCorrect: user.totalCorrect,
    })
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editUser) return
    try {
      setSaving(true)
      await adminApi.updateUser(editUser.id, editForm)
      onToast('用户信息更新成功')
      setEditUser(null)
      loadUsers(pagination.page, search)
    } catch (err) {
      onToast('更新失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  // 计算正确率
  const getAccuracy = (u: AdminUser) => {
    if (!u.totalQuiz || u.totalQuiz === 0) return 0
    return Math.round((u.totalCorrect / u.totalQuiz) * 100)
  }

  return (
    <div className="users-panel">
      {/* 搜索栏 */}
      <div className="admin-toolbar">
        <input
          className="input admin-search-input"
          placeholder="输入用户名或邮箱搜索..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
        />
        <button className="btn btn-primary" onClick={handleSearch}>搜索</button>
      </div>

      {/* 用户列表 */}
      <div className="card admin-table-card">
        {loading ? (
          <div className="admin-loading">加载中...</div>
        ) : users.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>怪兽</th>
                  <th>连胜</th>
                  <th>答题数</th>
                  <th>正确率</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-name">{u.username}</span>
                        {u.role === 'admin' && <span className="badge badge-warning">管理员</span>}
                      </div>
                    </td>
                    <td className="email-cell">{u.email}</td>
                    <td>
                      <div className="monster-cell">
                        <span>{u.monsterName}</span>
                        <span className="badge badge-primary">Lv.{u.monsterLevel}</span>
                      </div>
                    </td>
                    <td>{u.streakDays}天</td>
                    <td>{u.totalQuiz}</td>
                    <td>
                      <span className={'accuracy ' + (getAccuracy(u) >= 60 ? 'good' : 'low')}>
                        {getAccuracy(u)}%
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="action-cell">
                        <button className="btn btn-secondary admin-action-btn" onClick={() => openEdit(u)}>
                          编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">暂无用户数据</div>
        )}

        {/* 分页 */}
        {!loading && users.length > 0 && (
          <div className="admin-pagination">
            <button
              className="btn btn-secondary admin-page-btn"
              disabled={pagination.page <= 1}
              onClick={() => loadUsers(pagination.page - 1)}
            >
              上一页
            </button>
            <span className="page-info">
              第 {pagination.page} / {pagination.totalPages || 1} 页 (共 {pagination.total} 条)
            </span>
            <button
              className="btn btn-secondary admin-page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadUsers(pagination.page + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 编辑用户弹窗 */}
      {editUser && (
        <div className="admin-modal-mask" onClick={() => !saving && setEditUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>编辑用户 - {editUser.username}</h3>
              <button className="modal-close" onClick={() => setEditUser(null)} disabled={saving}>×</button>
            </div>
            <div className="admin-modal-body">
              <div className="form-group">
                <label>怪兽等级</label>
                <input
                  type="number"
                  className="input"
                  value={editForm.monsterLevel}
                  min={0}
                  onChange={(e) => setEditForm({ ...editForm, monsterLevel: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>连胜天数</label>
                <input
                  type="number"
                  className="input"
                  value={editForm.streakDays}
                  min={0}
                  onChange={(e) => setEditForm({ ...editForm, streakDays: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>总答对数</label>
                <input
                  type="number"
                  className="input"
                  value={editForm.totalCorrect}
                  min={0}
                  onChange={(e) => setEditForm({ ...editForm, totalCorrect: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditUser(null)} disabled={saving}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 3. 题目管理模块 =====
function QuestionsPanel({ onToast }: { onToast: ToastFn }) {
  const [questions, setQuestions] = useState<AdminQuestion[]>([])
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [subjectFilter, setSubjectFilter] = useState('')
  const [loading, setLoading] = useState(true)
  // 添加/编辑弹窗：null=关闭，{}=新增，{...}=编辑
  const [editQuestion, setEditQuestion] = useState<Partial<AdminQuestion> | null>(null)
  const [form, setForm] = useState({ subjectId: '', content: '', options: ['', '', '', ''], answer: 0, difficulty: 1, type: 'choice' as string, fillblankAnswer: '', explanation: '', tagsText: '' })
  const [saving, setSaving] = useState(false)
  // 删除确认弹窗
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null)

  // 加载学科列表（用于筛选 + 表单选择）
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await adminApi.subjects()
        setSubjects(res.subjects as AdminSubject[])
      } catch (err) {
        // 静默失败，不影响主流程
      }
    }
    loadSubjects()
  }, [])

  // 加载题目列表
  const loadQuestions = async (page: number = 1, subjectId: string = subjectFilter) => {
    try {
      setLoading(true)
      const res = await adminApi.questions(page, 20, subjectId)
      setQuestions(res.questions)
      setPagination(res.pagination)
    } catch (err) {
      onToast('加载题目列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 首次加载
  useEffect(() => {
    loadQuestions(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 筛选学科
  const handleFilter = (subjectId: string) => {
    setSubjectFilter(subjectId)
    loadQuestions(1, subjectId)
  }

  // 打开新增弹窗
  const openAdd = () => {
    setEditQuestion({})
    setForm({
      subjectId: subjects[0]?.id || '',
      content: '',
      options: ['', '', '', ''],
      answer: 0,
      difficulty: 1,
      type: 'choice',
      fillblankAnswer: '',
      explanation: '',
      tagsText: '',
    })
  }

  // 打开编辑弹窗（通过 subject.name 匹配获取 subjectId）
  const openEdit = (q: AdminQuestion) => {
    setEditQuestion(q)
    const matched = subjects.find((s) => s.name === q.subject?.name)
    setForm({
      subjectId: matched?.id || subjects[0]?.id || '',
      content: q.content || '',
      options: Array.isArray(q.options) ? [...q.options] : ['', '', '', ''],
      answer: q.answer ?? 0,
      difficulty: q.difficulty ?? 1,
      type: q.type || 'choice',
      fillblankAnswer: q.type === 'fillblank' ? (q.answer !== undefined ? String(q.answer) : '') : '',
      explanation: q.explanation || '',
      tagsText: q.tags ? (Array.isArray(q.tags) ? q.tags.join(', ') : '') : '',
    })
  }

  // 修改某个选项
  const setOption = (index: number, value: string) => {
    const newOptions = [...form.options]
    newOptions[index] = value
    setForm({ ...form, options: newOptions })
  }

  // 保存题目（新增/编辑）
  const handleSave = async () => {
    // 表单校验
    if (!form.subjectId) { onToast('请选择学科', 'error'); return }
    if (!form.content.trim()) { onToast('请输入题目内容', 'error'); return }
    if (form.type === 'choice' && form.options.some((o) => !o.trim())) { onToast('请填写所有选项', 'error'); return }
    if (form.type === 'fillblank' && !form.fillblankAnswer.trim()) { onToast('请输入填空题答案', 'error'); return }

    try {
      setSaving(true)
      const tags = form.tagsText.trim() ? form.tagsText.split(/[,，]/).map(t => t.trim()).filter(Boolean) : undefined
      const data: QuestionSaveData = {
        subjectId: form.subjectId,
        content: form.content,
        type: form.type,
        explanation: form.explanation || undefined,
        tags,
        difficulty: Number(form.difficulty),
      }
      if (form.type === 'fillblank') {
        data.options = ['填空题'] // 填空题选项占位
        data.answer = form.fillblankAnswer
      } else {
        data.options = form.options
        data.answer = form.answer
      }
      if (editQuestion && editQuestion.id) {
        await adminApi.updateQuestion(editQuestion.id, data as UpdateQuestionRequest)
        onToast('题目更新成功')
      } else {
        await adminApi.addQuestion(data as AddQuestionRequest)
        onToast('题目添加成功')
      }
      setEditQuestion(null)
      loadQuestions(pagination.page, subjectFilter)
    } catch (err) {
      onToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  // 确认删除
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setSaving(true)
      await adminApi.deleteQuestion(deleteTarget.id)
      onToast('题目已删除')
      setDeleteTarget(null)
      loadQuestions(pagination.page, subjectFilter)
    } catch (err) {
      onToast('删除失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="questions-panel">
      {/* 工具栏：学科筛选 + 添加按钮 */}
      <div className="admin-toolbar">
        <select
          className="input admin-select"
          value={subjectFilter}
          onChange={(e) => handleFilter(e.target.value)}
        >
          <option value="">全部学科</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>+ 添加题目</button>
      </div>

      {/* 题目列表 */}
      <div className="card admin-table-card">
        {loading ? (
          <div className="admin-loading">加载中...</div>
        ) : questions.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>题目内容</th>
                  <th>学科</th>
                  <th>题型</th>
                  <th>难度</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td className="content-cell" title={q.content}>{q.content}</td>
                    <td>
                      <span className="subject-tag">{q.subject?.icon} {q.subject?.name}</span>
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: 12, background: q.type === 'fillblank' ? 'var(--warning-light)' : 'var(--bg-muted)', color: q.type === 'fillblank' ? 'var(--warning)' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {q.type === 'fillblank' ? '填空题' : '选择题'}
                      </span>
                    </td>
                    <td className="stars-cell">{renderStars(q.difficulty)}</td>
                    <td>
                      {q.isActive ? (
                        <span className="badge badge-success">启用</span>
                      ) : (
                        <span className="badge badge-danger">禁用</span>
                      )}
                    </td>
                    <td className="date-cell">{formatDate(q.createdAt)}</td>
                    <td>
                      <div className="action-cell">
                        <button className="btn btn-secondary admin-action-btn" onClick={() => openEdit(q)}>
                          编辑
                        </button>
                        <button className="btn btn-danger admin-action-btn" onClick={() => setDeleteTarget(q)}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">暂无题目数据</div>
        )}

        {/* 分页 */}
        {!loading && questions.length > 0 && (
          <div className="admin-pagination">
            <button
              className="btn btn-secondary admin-page-btn"
              disabled={pagination.page <= 1}
              onClick={() => loadQuestions(pagination.page - 1)}
            >
              上一页
            </button>
            <span className="page-info">
              第 {pagination.page} / {pagination.totalPages || 1} 页 (共 {pagination.total} 条)
            </span>
            <button
              className="btn btn-secondary admin-page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadQuestions(pagination.page + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 添加/编辑题目弹窗 */}
      {editQuestion && (
        <div className="admin-modal-mask" onClick={() => !saving && setEditQuestion(null)}>
          <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editQuestion.id ? '编辑题目' : '添加题目'}</h3>
              <button className="modal-close" onClick={() => setEditQuestion(null)} disabled={saving}>×</button>
            </div>
            <div className="admin-modal-body">
              {/* 学科选择 */}
              <div className="form-group">
                <label>学科</label>
                <select
                  className="input"
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                >
                  <option value="">请选择学科</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>
              {/* 题型选择 */}
              <div className="form-group">
                <label>题型</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="choice">选择题</option>
                  <option value="fillblank">填空题</option>
                </select>
              </div>
              {/* 题目内容 */}
              <div className="form-group">
                <label>题目内容</label>
                <textarea
                  className="input admin-textarea"
                  rows={3}
                  placeholder="请输入题目内容..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </div>
              {/* 4 个选项 + 正确答案选择（仅选择题） */}
              {form.type !== 'fillblank' && (
              <div className="form-group">
                <label>选项（点击左侧圆圈标记正确答案）</label>
                <div className="options-list">
                  {form.options.map((opt, i) => (
                    <div key={i} className="option-row">
                      <label className={'option-radio' + (form.answer === i ? ' checked' : '')}>
                        <input
                          type="radio"
                          name="answer"
                          checked={form.answer === i}
                          onChange={() => setForm({ ...form, answer: i })}
                        />
                        <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                      </label>
                      <input
                        className="input"
                        placeholder={`选项 ${String.fromCharCode(65 + i)}`}
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              )}
              {/* 填空题答案 */}
              {form.type === 'fillblank' && (
              <div className="form-group">
                <label>正确答案（多个答案用 | 分隔，如 apple|Apple）</label>
                <input
                  className="input"
                  placeholder="如：apple|Apple"
                  value={form.fillblankAnswer}
                  onChange={(e) => setForm({ ...form, fillblankAnswer: e.target.value })}
                />
                <p className="form-hint">题目中的 ____ 或 ______ 会被替换为输入框</p>
              </div>
              )}
              {/* 解析 */}
              <div className="form-group">
                <label>题目解析（可选）</label>
                <textarea
                  className="input admin-textarea"
                  rows={2}
                  placeholder="题目解析/知识点讲解..."
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                />
              </div>
              {/* 知识点标签 */}
              <div className="form-group">
                <label>知识点标签（可选，逗号分隔）</label>
                <input
                  className="input"
                  placeholder="如：时态, 被动语态"
                  value={form.tagsText}
                  onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
                />
              </div>
              {/* 难度选择 */}
              <div className="form-group">
                <label>难度</label>
                <div className="difficulty-picker">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={'difficulty-star' + (form.difficulty >= d ? ' active' : '')}
                      onClick={() => setForm({ ...form, difficulty: d })}
                    >
                      ★
                    </button>
                  ))}
                  <span className="difficulty-text">难度 {form.difficulty}</span>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditQuestion(null)} disabled={saving}>取消</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="admin-modal-mask" onClick={() => !saving && setDeleteTarget(null)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>确认删除</h3>
            </div>
            <div className="admin-modal-body">
              <p className="confirm-text">确定要删除这道题目吗？</p>
              <p className="confirm-content">{deleteTarget.content}</p>
              <p className="confirm-warn">此操作不可撤销</p>
            </div>
            <div className="admin-modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={saving}>取消</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 4. 学科管理模块 =====
function SubjectsPanel({ onToast }: { onToast: ToastFn }) {
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [loading, setLoading] = useState(true)
  // 添加/编辑弹窗
  const [editSubject, setEditSubject] = useState<Partial<AdminSubject> | null>(null)
  const [form, setForm] = useState({ name: '', icon: '📚', description: '' })
  const [saving, setSaving] = useState(false)

  // 加载学科列表
  const loadSubjects = async () => {
    try {
      setLoading(true)
      const res = await adminApi.subjects()
      setSubjects(res.subjects as AdminSubject[])
    } catch (err) {
      onToast('加载学科列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  // 打开新增弹窗
  const openAdd = () => {
    setEditSubject({})
    setForm({ name: '', icon: '📚', description: '' })
  }

  // 打开编辑弹窗
  const openEdit = (s: AdminSubject) => {
    setEditSubject(s)
    setForm({ name: s.name || '', icon: s.icon || '📚', description: s.description || '' })
  }

  // 保存学科
  const handleSave = async () => {
    if (!form.name.trim()) { onToast('请输入学科名称', 'error'); return }
    if (!form.icon.trim()) { onToast('请输入学科图标', 'error'); return }

    try {
      setSaving(true)
      if (editSubject && editSubject.id) {
        await adminApi.updateSubject(editSubject.id, form)
        onToast('学科更新成功')
      } else {
        await adminApi.addSubject(form)
        onToast('学科添加成功')
      }
      setEditSubject(null)
      loadSubjects()
    } catch (err) {
      onToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  // 切换启用/禁用状态
  const toggleActive = async (s: AdminSubject) => {
    try {
      await adminApi.updateSubject(s.id, { isActive: !s.isActive })
      onToast(s.isActive ? '已禁用学科' : '已启用学科')
      loadSubjects()
    } catch (err) {
      onToast('操作失败', 'error')
    }
  }

  return (
    <div className="subjects-panel">
      {/* 工具栏 */}
      <div className="admin-toolbar">
        <span className="toolbar-title">共 {subjects.length} 个学科</span>
        <button className="btn btn-primary" onClick={openAdd}>+ 添加学科</button>
      </div>

      {/* 学科列表 */}
      <div className="card admin-table-card">
        {loading ? (
          <div className="admin-loading">加载中...</div>
        ) : subjects.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>图标</th>
                  <th>名称</th>
                  <th>描述</th>
                  <th>题目数</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="icon-cell">{s.icon}</td>
                    <td className="name-cell">{s.name}</td>
                    <td className="desc-cell">{s.description || '-'}</td>
                    <td><span className="badge badge-primary">{s.questionCount} 题</span></td>
                    <td>
                      {s.isActive ? (
                        <span className="badge badge-success">启用</span>
                      ) : (
                        <span className="badge badge-danger">禁用</span>
                      )}
                    </td>
                    <td>
                      <div className="action-cell">
                        <button className="btn btn-secondary admin-action-btn" onClick={() => openEdit(s)}>
                          编辑
                        </button>
                        <button
                          className={'btn admin-action-btn ' + (s.isActive ? 'btn-danger' : 'btn-primary')}
                          onClick={() => toggleActive(s)}
                        >
                          {s.isActive ? '禁用' : '启用'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">暂无学科数据</div>
        )}
      </div>

      {/* 添加/编辑学科弹窗 */}
      {editSubject && (
        <div className="admin-modal-mask" onClick={() => !saving && setEditSubject(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editSubject.id ? '编辑学科' : '添加学科'}</h3>
              <button className="modal-close" onClick={() => setEditSubject(null)} disabled={saving}>×</button>
            </div>
            <div className="admin-modal-body">
              <div className="form-group">
                <label>学科名称</label>
                <input
                  className="input"
                  placeholder="如：数学"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>学科图标（emoji）</label>
                <input
                  className="input"
                  placeholder="如：📐"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                />
                <p className="form-hint">输入一个 emoji 表情作为图标</p>
              </div>
              <div className="form-group">
                <label>学科描述</label>
                <textarea
                  className="input admin-textarea"
                  rows={3}
                  placeholder="请输入学科描述..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditSubject(null)} disabled={saving}>取消</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
