// 小组详情页 - 顶部小组信息、成员列表、小组目标、组内排行榜
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { groupApi } from '../services/api'
import GroupGoalCard from '../components/GroupGoalCard'
import type { GroupDetailResponse, GroupRankingItem, CreateGroupGoalRequest, GroupGoalType } from '../types'

export default function StudyGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<GroupDetailResponse | null>(null)
  const [ranking, setRanking] = useState<GroupRankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // 创建目标弹窗
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalForm, setGoalForm] = useState<CreateGroupGoalRequest>({
    title: '',
    description: '',
    targetType: 'total_quiz',
    targetValue: 50,
  })
  const [creatingGoal, setCreatingGoal] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    setError('')
    try {
      const [d, r] = await Promise.all([
        groupApi.detail(groupId),
        groupApi.ranking(groupId),
      ])
      setDetail(d)
      setRanking(r.ranking)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载小组详情失败')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const handleJoin = async () => {
    if (!groupId) return
    setActionLoading(true)
    try {
      await groupApi.join(groupId)
      await loadDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!groupId) return
    if (!confirm('确定要退出这个小组吗？退出后将不再参与小组进度。')) return
    setActionLoading(true)
    try {
      await groupApi.leave(groupId)
      navigate('/groups')
    } catch (err) {
      setError(err instanceof Error ? err.message : '退出失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateGoal = async () => {
    if (!groupId) return
    if (!goalForm.title.trim()) {
      setError('请输入目标标题')
      return
    }
    setCreatingGoal(true)
    setError('')
    try {
      await groupApi.createGoal(groupId, goalForm)
      setShowGoalModal(false)
      setGoalForm({ title: '', description: '', targetType: 'total_quiz', targetValue: 50 })
      await loadDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建目标失败')
    } finally {
      setCreatingGoal(false)
    }
  }

  if (loading) {
    return (
      <div className="group-detail-page">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="group-detail-page">
        <div className="error-state">
          <p>{error || '小组不存在'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/groups')}>返回小组列表</button>
        </div>
      </div>
    )
  }

  const { group, members, goals, isMember, isOwner, myRole } = detail
  const canManage = myRole === 'owner' || myRole === 'admin'

  return (
    <div className="group-detail-page">
      {/* 错误提示 */}
      {error && (
        <div className="error-bar">
          <span>{error}</span>
          <button className="error-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* 顶部小组信息卡片 */}
      <div className="card group-header-card">
        <div className="group-header-top">
          <div className="group-avatar-large">{group.avatar}</div>
          <div className="group-header-info">
            <h1 className="group-title">{group.name}</h1>
            {group.description && <p className="group-desc">{group.description}</p>}
            <div className="group-meta">
              <span className="meta-item">👑 组长：{group.ownerName}</span>
              <span className="meta-item">👥 {group.memberCount}/{group.maxMembers} 成员</span>
              <span className="meta-item">📅 创建于 {new Date(group.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </div>

        <div className="group-header-actions">
          {!isMember ? (
            <button
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={actionLoading || group.memberCount >= group.maxMembers}
            >
              {group.memberCount >= group.maxMembers ? '小组已满' : '+ 加入小组'}
            </button>
          ) : (
            <>
              {!isOwner && (
                <button
                  className="btn btn-secondary"
                  onClick={handleLeave}
                  disabled={actionLoading}
                >
                  退出小组
                </button>
              )}
              {canManage && (
                <button className="btn btn-primary" onClick={() => setShowGoalModal(true)}>
                  + 创建目标
                </button>
              )}
            </>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/groups')}>
            返回列表
          </button>
        </div>
      </div>

      {/* 双列布局：左侧目标 + 右侧排行榜 */}
      <div className="group-content-grid">
        {/* 左侧：成员列表 */}
        <section className="content-section">
          <h2 className="section-title">小组成员（{members.length}）</h2>
          <div className="members-grid">
            {members.map((m, idx) => (
              <div key={m.userId} className={'member-card' + (m.userId === detail.group.ownerId ? ' is-owner' : '')}>
                <div className="member-avatar">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.username} />
                  ) : (
                    <span>{m.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="member-info">
                  <div className="member-name-row">
                    <span className="member-name">{m.username}</span>
                    {m.role === 'owner' && <span className="role-tag role-owner-tag">组长</span>}
                    {m.role === 'admin' && <span className="role-tag role-admin-tag">管理员</span>}
                  </div>
                  <div className="member-stats">
                    <span className="member-stat">📝 {m.weeklyQuizCount}</span>
                    <span className="member-stat">✅ {m.weeklyCorrectCount}</span>
                    <span className="member-stat member-accuracy">{m.accuracy}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 右侧上：小组目标 */}
        <section className="content-section">
          <div className="section-header-row">
            <h2 className="section-title">小组目标</h2>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowGoalModal(true)}>
                + 添加
              </button>
            )}
          </div>
          {goals.length === 0 ? (
            <div className="empty-inline">
              <p>暂无小组目标{canManage ? '，点击右上角"添加"创建第一个目标' : ''}</p>
            </div>
          ) : (
            <div className="goals-list">
              {goals.map((g) => (
                <GroupGoalCard key={g.id} goal={g} />
              ))}
            </div>
          )}
        </section>

        {/* 右侧下：组内排行榜 */}
        <section className="content-section">
          <h2 className="section-title">本周排行榜</h2>
          {ranking.length === 0 ? (
            <div className="empty-inline">
              <p>本周暂无排行数据</p>
            </div>
          ) : (
            <div className="ranking-list">
              {ranking.map((r, idx) => (
                <div key={r.userId} className={'ranking-item rank-' + (idx + 1)}>
                  <div className={'rank-number rank-num-' + (idx + 1)}>
                    {idx + 1}
                  </div>
                  <div className="rank-avatar">
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt={r.username} />
                    ) : (
                      <span>{r.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="rank-info">
                    <div className="rank-name">{r.username}</div>
                    <div className="rank-meta">
                      答题 {r.weeklyQuizCount} · 正确 {r.weeklyCorrectCount} · 正确率 {r.accuracy}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 创建目标弹窗 */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content goal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建小组目标</h3>
              <button className="modal-close-btn" onClick={() => setShowGoalModal(false)} aria-label="关闭">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label className="form-label">目标标题 <span className="required">*</span></label>
                <input
                  className="input"
                  type="text"
                  value={goalForm.title}
                  maxLength={50}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="如：本周全员答题200道"
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label className="form-label">目标描述</label>
                <textarea
                  className="input textarea"
                  value={goalForm.description}
                  maxLength={200}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="描述目标的具体要求..."
                  rows={3}
                />
              </div>
              <div className="form-field">
                <label className="form-label">目标类型</label>
                <div className="goal-type-options">
                  {([
                    { value: 'total_quiz', label: '总答题数', icon: '📝', desc: '累计答题数量' },
                    { value: 'total_correct', label: '总正确数', icon: '✅', desc: '累计答对数量' },
                    { value: 'streak_days', label: '连续天数', icon: '🔥', desc: '连续学习天数' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      className={'goal-type-option' + (goalForm.targetType === opt.value ? ' selected' : '')}
                      onClick={() => setGoalForm({ ...goalForm, targetType: opt.value as GroupGoalType })}
                      type="button"
                    >
                      <span className="goal-type-icon">{opt.icon}</span>
                      <span className="goal-type-label">{opt.label}</span>
                      <span className="goal-type-desc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">目标值：{goalForm.targetValue}</label>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={goalForm.targetValue}
                  onChange={(e) => setGoalForm({ ...goalForm, targetValue: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>5</span><span>500</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGoalModal(false)} disabled={creatingGoal}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateGoal} disabled={creatingGoal}>
                {creatingGoal ? '创建中...' : '创建目标'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .group-detail-page {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .error-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--danger-light);
          color: var(--danger);
          border-radius: var(--radius);
          font-size: 14px;
          font-weight: 500;
        }
        .error-bar span { flex: 1; }
        .error-close {
          background: transparent;
          border: none;
          color: var(--danger);
          font-size: 20px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .loading-screen, .error-state {
          padding: 60px 24px;
          text-align: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }
        .error-state p {
          margin: 0 0 16px;
          color: var(--text-secondary);
        }
        .group-header-card {
          padding: 24px;
        }
        .group-header-top {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .group-avatar-large {
          font-size: 64px;
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-muted);
          border-radius: var(--radius-lg);
          flex-shrink: 0;
        }
        .group-header-info {
          flex: 1;
          min-width: 0;
        }
        .group-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 8px;
        }
        .group-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 12px;
        }
        .group-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .meta-item {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .group-header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .group-content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .content-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        .member-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          transition: all 0.2s;
        }
        .member-card:hover {
          border-color: var(--primary);
          transform: translateY(-1px);
        }
        .member-card.is-owner {
          border-color: var(--warning);
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(251, 191, 36, 0.05) 100%);
        }
        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          overflow: hidden;
          flex-shrink: 0;
        }
        .member-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .member-info {
          flex: 1;
          min-width: 0;
        }
        .member-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .member-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .role-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: var(--radius-full, 999px);
          flex-shrink: 0;
        }
        .role-owner-tag { background: var(--warning-light); color: var(--warning); }
        .role-admin-tag { background: var(--primary-light); color: var(--primary); }
        .member-stats {
          display: flex;
          gap: 8px;
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .member-accuracy {
          color: var(--success);
          font-weight: 600;
        }
        .goals-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .empty-inline {
          padding: 32px 16px;
          text-align: center;
          background: var(--bg-card);
          border: 1px dashed var(--border);
          border-radius: var(--radius);
        }
        .empty-inline p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
        }
        .ranking-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ranking-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          transition: all 0.2s;
        }
        .ranking-item:hover {
          transform: translateX(2px);
        }
        .ranking-item.rank-1 {
          border-color: var(--warning);
          background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--warning) 8%, transparent) 100%);
        }
        .ranking-item.rank-2 {
          border-color: var(--text-muted);
        }
        .ranking-item.rank-3 {
          border-color: var(--warning);
        }
        .rank-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-muted);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
        }
        .rank-num-1 { background: linear-gradient(135deg, var(--warning), var(--warning)); color: var(--text-on-primary); }
        .rank-num-2 { background: linear-gradient(135deg, var(--text-muted), var(--text-muted)); color: var(--text-on-primary); }
        .rank-num-3 { background: linear-gradient(135deg, var(--warning), var(--warning)); color: var(--text-on-primary); }
        .rank-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          overflow: hidden;
          flex-shrink: 0;
        }
        .rank-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .rank-info {
          flex: 1;
          min-width: 0;
        }
        .rank-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .rank-meta {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* 弹窗 */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: var(--bg-card);
          border-radius: var(--radius-lg, 16px);
          box-shadow: var(--shadow-float);
          max-width: 520px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 12px;
          border-bottom: 1px solid var(--border);
        }
        .modal-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .modal-close-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
        }
        .modal-close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px 20px;
          border-top: 1px solid var(--border);
        }
        .form-field {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .required {
          color: var(--danger);
        }
        .input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--bg-muted);
          color: var(--text-primary);
          font-family: inherit;
          box-sizing: border-box;
        }
        .input:focus {
          outline: none;
          border-color: var(--primary);
          background: var(--bg-card);
        }
        .textarea {
          resize: vertical;
          min-height: 70px;
        }
        .goal-type-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .goal-type-option {
          padding: 12px 8px;
          background: var(--bg-muted);
          border: 1.5px solid transparent;
          border-radius: var(--radius);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.15s;
        }
        .goal-type-option:hover {
          background: var(--bg-hover);
        }
        .goal-type-option.selected {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .goal-type-icon {
          font-size: 20px;
        }
        .goal-type-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .goal-type-desc {
          font-size: 11px;
          color: var(--text-muted);
        }
        .btn-sm {
          padding: 6px 14px;
          font-size: 13px;
        }
        @media (max-width: 768px) {
          .group-content-grid {
            grid-template-columns: 1fr;
          }
          .group-header-top {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .group-meta {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
