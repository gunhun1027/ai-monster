// 个人中心页面
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGame } from '../hooks/useGame'
import AchievementBadge from '../components/AchievementBadge'
import StoryRouteTracker from '../components/StoryRouteTracker'
import UserTitleBadge from '../components/UserTitleBadge'
import HeatmapCalendar from '../components/HeatmapCalendar'
import StreakFlame from '../components/StreakFlame'
import { quizApi, studyPlanApi, analyticsApi } from '../services/api'
import type { QuizRecord, StudyPlanData, StoryRouteType, HeatmapCell, HeatmapStats } from '../types'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { achievements, loading, error, fetchAchievements, renameMonster, setError } = useGame()

  // ===== 怪兽名字编辑 =====
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  // ===== 答题历史 =====
  const [records, setRecords] = useState<QuizRecord[]>([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ===== 学习计划 =====
  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)

  // ===== 学习热力图 =====
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([])
  const [heatmapStats, setHeatmapStats] = useState<HeatmapStats | null>(null)
  const [loadingHeatmap, setLoadingHeatmap] = useState(false)

  // 进入页面加载成就和历史
  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  // 加载学习热力图数据
  useEffect(() => {
    const loadHeatmap = async () => {
      setLoadingHeatmap(true)
      try {
        const data = await analyticsApi.heatmap()
        setHeatmapData(data.heatmapData)
        setHeatmapStats(data.stats)
      } catch (err) {
      } finally {
        setLoadingHeatmap(false)
      }
    }
    loadHeatmap()
  }, [])

  // 加载学习计划
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const data = await studyPlanApi.get()
        setStudyPlan(data)
      } catch {}
    }
    loadPlan()
  }, [])

  // 加载答题历史
  const loadHistory = useCallback(async (p: number) => {
    setLoadingHistory(true)
    try {
      const data = await quizApi.history(p, 10)
      setRecords(data.records)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取答题记录失败')
    } finally {
      setLoadingHistory(false)
    }
  }, [setError])

  useEffect(() => {
    loadHistory(page)
  }, [page, loadHistory])

  // 开始编辑怪兽名
  const startEditName = () => {
    setNameInput(user?.monsterName || '')
    setEditingName(true)
  }

  // 保存怪兽名
  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed) {
      setError('怪兽名字不能为空')
      return
    }
    if (trimmed.length > 20) {
      setError('怪兽名字最多 20 个字符')
      return
    }
    setSavingName(true)
    try {
      const newName = await renameMonster(trimmed)
      updateUser({ monsterName: newName })
      setEditingName(false)
    } catch (err) {
      // 错误已在 hook 中处理
    } finally {
      setSavingName(false)
    }
  }

  // 取消编辑
  const handleCancelName = () => {
    setEditingName(false)
    setNameInput('')
  }

  // 格式化时间显示
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
    } catch {
      return dateStr
    }
  }

  // 计算正确率
  const accuracy = user && user.totalQuiz > 0
    ? Math.round((user.totalCorrect / user.totalQuiz) * 100)
    : 0

  // 获取用户名首字母
  const userInitial = (user?.username || '?').charAt(0).toUpperCase()

  // 4 个统计卡片数据（使用 SVG 图标）
  const statCards = user
    ? [
        {
          label: '怪兽等级',
          value: `Lv.${user.monsterLevel}`,
          color: 'primary',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.5 7.5L18 8L14 12L15 18L10 15L5 18L6 12L2 8L7.5 7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          ),
        },
        {
          label: '连胜天数',
          value: `${user.streakDays} 天`,
          color: 'danger',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 6 6 6 10C6 12.2 7.8 14 10 14C12.2 14 14 12.2 14 10C14 6 10 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10 14V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ),
        },
        {
          label: '总答题数',
          value: `${user.totalQuiz}`,
          color: 'primary',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="3" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="7" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="7" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ),
        },
        {
          label: '正确率',
          value: `${accuracy}%`,
          color: 'success',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
        },
      ]
    : []

  return (
    <div className="profile-page">
      {/* 错误提示条 */}
      {error && (
        <div className="profile-error-bar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="8" y1="4.5" x2="8" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11.5" r="0.75" fill="currentColor"/>
          </svg>
          <span>{error}</span>
          <button className="error-close" onClick={() => setError(null)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* ===== 顶部用户信息卡片 ===== */}
      <div className="card profile-user-card">
        <div className="user-card-top">
          {/* 头像 - 首字母圆形 */}
          <div className="user-avatar-circle">{userInitial}</div>

          <div className="user-info-main">
            <div className="user-name-row">
              <h2 className="user-name">{user?.username}</h2>
              {/* 剧情系统 v2：称号徽章（可点击切换） */}
              {user?.title && (
                <UserTitleBadge
                  title={user.title}
                  onTitleChange={(newTitle) => updateUser({ title: newTitle })}
                />
              )}
            </div>

            {/* 怪兽名字（可编辑） */}
            <div className="user-monster-name-row">
              {!editingName ? (
                <button className="monster-name-edit-btn" onClick={startEditName}>
                  <span>{user?.monsterName}</span>
                  <svg className="edit-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9.5 2.5L11.5 4.5M2 10L10 2L12 4L4 12H2V10Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </button>
              ) : (
                <div className="monster-name-edit-form">
                  <input
                    className="input monster-name-input"
                    type="text"
                    value={nameInput}
                    maxLength={20}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="输入怪兽名字"
                    autoFocus
                  />
                  <button
                    className="btn btn-primary save-btn"
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? '保存中' : '保存'}
                  </button>
                  <button className="btn btn-secondary" onClick={handleCancelName} disabled={savingName}>
                    取消
                  </button>
                </div>
              )}
            </div>

            {/* 注册时间 */}
            <p className="user-meta">注册时间：{user ? formatDate(user.createdAt) : '-'}</p>
          </div>
        </div>

        {/* 4 个统计卡片 */}
        <div className="user-stats-grid">
          {statCards.map((s) => (
            <div key={s.label} className={'user-stat-card stat-' + s.color}>
              <div className="user-stat-icon">{s.icon}</div>
              <div className="user-stat-value">{s.value}</div>
              <div className="user-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 学习热力图区域（v3） ===== */}
      <section className="profile-section">
        <div className="heatmap-header">
          <h2 className="section-title">学习热力图</h2>
          {heatmapStats && (
            <StreakFlame streak={heatmapStats.currentStreak} />
          )}
        </div>

        {loadingHeatmap && <p className="section-loading">加载热力图中...</p>}
        {!loadingHeatmap && (
          <div className="card heatmap-card">
            <HeatmapCalendar data={heatmapData} />
          </div>
        )}

        {/* 统计数字 */}
        {heatmapStats && (
          <div className="heatmap-stats-grid">
            <div className="heatmap-stat-card">
              <div className="heatmap-stat-value">{heatmapStats.totalDays}</div>
              <div className="heatmap-stat-label">学习天数</div>
            </div>
            <div className="heatmap-stat-card">
              <div className="heatmap-stat-value">{heatmapStats.longestStreak}</div>
              <div className="heatmap-stat-label">最长连续</div>
            </div>
            <div className="heatmap-stat-card">
              <div className="heatmap-stat-value">{heatmapStats.totalQuestions}</div>
              <div className="heatmap-stat-label">总答题数</div>
            </div>
            <div className="heatmap-stat-card">
              <div className="heatmap-stat-value">{heatmapStats.averagePerDay}</div>
              <div className="heatmap-stat-label">日均答题</div>
            </div>
          </div>
        )}
      </section>

      {/* ===== 剧情路线区域（剧情系统 v2） ===== */}
      <section className="profile-section">
        <h2 className="section-title">剧情路线</h2>
        <StoryRouteTracker
          route={(user?.storyRoute as StoryRouteType) || 'none'}
        />
        {user?.cardCollectionCount !== undefined && (
          <div className="card-collection-summary">
            <Link className="ccs-link" to="/cards">
              <span className="ccs-icon">📚</span>
              <span className="ccs-text">已收集 {user.cardCollectionCount} 张知识卡片</span>
              <span className="ccs-arrow">→</span>
            </Link>
          </div>
        )}
      </section>

      {/* ===== 成就区域 ===== */}
      <section className="profile-section">
        <h2 className="section-title">我的成就</h2>
        {loading && <p className="section-loading">加载中...</p>}
        {!loading && achievements.length === 0 && (
          <p className="section-empty">暂无成就数据</p>
        )}
        <div className="achievements-grid">
          {achievements.map((a) => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </div>
      </section>

      {/* ===== 学习计划设置 ===== */}
      <section className="profile-section">
        <h2 className="section-title">学习计划</h2>
        {studyPlan && (
          <div className="card" style={{ padding: 20 }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>每日答题目标：{studyPlan.dailyGoal} 题</label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={studyPlan.dailyGoal}
                onChange={(e) => setStudyPlan({ ...studyPlan, dailyGoal: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>5题</span><span>50题</span>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>每日学习时长目标：{studyPlan.dailyTimeGoal} 分钟</label>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={studyPlan.dailyTimeGoal}
                onChange={(e) => setStudyPlan({ ...studyPlan, dailyTimeGoal: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>5分钟</span><span>60分钟</span>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={studyPlan.reminderEnabled}
                  onChange={(e) => setStudyPlan({ ...studyPlan, reminderEnabled: e.target.checked })}
                  style={{ accentColor: 'var(--primary)' }}
                />
                每日提醒
              </label>
              {studyPlan.reminderEnabled && (
                <input
                  type="time"
                  className="input"
                  value={studyPlan.reminderTime || '20:00'}
                  onChange={(e) => setStudyPlan({ ...studyPlan, reminderTime: e.target.value })}
                  style={{ maxWidth: 160 }}
                />
              )}
            </div>
            <button
              className="btn btn-primary"
              onClick={async () => {
                setSavingPlan(true)
                try {
                  const updated = await studyPlanApi.update(studyPlan)
                  setStudyPlan(updated)
                } catch { setError('保存学习计划失败') }
                finally { setSavingPlan(false) }
              }}
              disabled={savingPlan}
              style={{ width: '100%' }}
            >
              {savingPlan ? '保存中...' : '保存学习计划'}
            </button>
          </div>
        )}
      </section>

      {/* ===== 答题历史区域 ===== */}
      <section className="profile-section">
        <h2 className="section-title">答题记录</h2>

        {loadingHistory && <p className="section-loading">加载中...</p>}

        {!loadingHistory && records.length === 0 && (
          <p className="section-empty">暂无答题记录</p>
        )}

        <div className="history-list">
          {records.map((rec) => (
            <div
              key={rec.id}
              className={'history-item' + (rec.isCorrect ? ' correct' : ' wrong')}
            >
              <div className="history-status">
                {rec.isCorrect ? (
                  <span className="status-icon correct">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                ) : (
                  <span className="status-icon wrong">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3L9 9M9 3L3 9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
              </div>
              <div className="history-content">
                <p className="history-question">{rec.question.content}</p>
                <div className="history-meta">
                  <span className="meta-tag">{rec.question.subject.name}</span>
                  <span className="meta-tag">{rec.timeTaken}秒</span>
                  <span className="meta-tag meta-exp">+{rec.expGained} EXP</span>
                  {rec.comboAtTime > 1 && <span className="meta-tag meta-combo">{rec.comboAtTime} 连击</span>}
                  <span className="meta-tag meta-time">{formatDate(rec.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 分页 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="history-pagination">
            <button
              className="btn btn-secondary page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loadingHistory}
            >
              上一页
            </button>
            <span className="page-info">
              第 {pagination.page} / {pagination.totalPages} 页
            </span>
            <button
              className="btn btn-secondary page-btn"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loadingHistory}
            >
              下一页
            </button>
          </div>
        )}
      </section>

      <style>{`
        .profile-page {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        /* 错误提示 */
        .profile-error-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--danger-light);
          color: var(--danger);
          border-radius: var(--radius);
          font-size: 14px;
          font-weight: 500;
        }
        .profile-error-bar span {
          flex: 1;
        }
        .error-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--danger);
          padding: 2px;
          cursor: pointer;
          border: none;
        }
        /* 用户信息卡片 */
        .profile-user-card {
          padding: 24px;
        }
        .user-card-top {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .user-avatar-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--primary);
          color: var(--text-on-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .user-info-main {
          flex: 1;
          min-width: 0;
        }
        .user-name-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .user-name {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        /* 怪兽名字编辑 */
        .user-monster-name-row {
          margin-bottom: 8px;
        }
        .monster-name-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: var(--primary);
          font-size: 15px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          transition: background 0.15s;
          border: none;
          cursor: pointer;
        }
        .monster-name-edit-btn:hover {
          background: var(--primary-light);
        }
        .edit-icon {
          opacity: 0.6;
        }
        .monster-name-edit-btn:hover .edit-icon {
          opacity: 1;
        }
        .monster-name-edit-form {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .monster-name-input {
          width: 200px;
          padding: 8px 12px;
          font-size: 14px;
        }
        .save-btn {
          padding: 8px 16px;
          font-size: 14px;
        }
        .user-meta {
          font-size: 13px;
          color: var(--text-secondary);
        }
        /* 统计卡片 */
        .user-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .user-stat-card {
          padding: 16px 12px;
          text-align: center;
          background: var(--bg-muted);
          border-radius: var(--radius);
        }
        .user-stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 6px;
          color: var(--text-secondary);
        }
        .user-stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .user-stat-label {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        /* 区块标题 */
        .profile-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        /* 学习热力图区域 */
        .heatmap-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .heatmap-card {
          padding: 20px;
          overflow-x: auto;
        }
        .heatmap-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .heatmap-stat-card {
          padding: 16px 12px;
          text-align: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          transition: transform 0.2s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
        }
        .heatmap-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06));
        }
        .heatmap-stat-value {
          font-size: 22px;
          font-weight: 800;
          color: var(--primary);
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
        }
        .heatmap-stat-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        @media (max-width: 600px) {
          .heatmap-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .heatmap-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        .section-loading, .section-empty {
          padding: 24px;
          text-align: center;
          color: var(--text-secondary);
          background: var(--bg-card);
          border-radius: var(--radius);
          border: 1px solid var(--border);
        }
        /* 成就网格 */
        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        /* 答题历史列表 */
        .history-list {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .history-item {
          display: flex;
          gap: 14px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
          transition: background 0.15s;
        }
        .history-item:last-child {
          border-bottom: none;
        }
        .history-item:hover {
          background: var(--bg-hover);
        }
        /* 答对绿色指示，答错红色指示 */
        .history-item.correct .history-status .status-icon {
          background: var(--success);
        }
        .history-item.wrong .history-status .status-icon {
          background: var(--danger);
        }
        .history-status {
          flex-shrink: 0;
        }
        .status-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .history-content {
          flex: 1;
          min-width: 0;
        }
        .history-question {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 8px;
          line-height: 1.5;
          word-break: break-word;
        }
        .history-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .meta-tag {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg-muted);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }
        .meta-exp {
          color: var(--warning);
          background: var(--warning-light);
          font-weight: 600;
        }
        .meta-combo {
          color: var(--danger);
          background: var(--danger-light);
          font-weight: 600;
        }
        .meta-time {
          color: var(--text-muted);
        }
        /* 分页 */
        .history-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 12px;
        }
        .page-btn {
          padding: 8px 18px;
          font-size: 14px;
        }
        .page-info {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        /* 响应式 */
        @media (max-width: 600px) {
          .user-card-top {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .user-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .achievements-grid {
            grid-template-columns: 1fr;
          }
          .monster-name-edit-form {
            justify-content: center;
          }
        }
        /* 卡片收集摘要（剧情系统 v2） */
        .card-collection-summary {
          margin-top: 12px;
        }
        .ccs-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 14px);
          color: var(--text-primary);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
        }
        .ccs-link:hover {
          background: var(--bg-hover, var(--bg-muted));
          border-color: var(--primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
        }
        .ccs-icon {
          font-size: 20px;
        }
        .ccs-text {
          flex: 1;
        }
        .ccs-arrow {
          color: var(--text-secondary);
          transition: transform 0.2s;
        }
        .ccs-link:hover .ccs-arrow {
          transform: translateX(4px);
          color: var(--primary);
        }
      `}</style>
    </div>
  )
}
