// 学习小组列表页 - 顶部创建按钮+搜索框，中间我加入的小组，下方推荐小组
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupApi } from '../services/api'
import CreateGroupModal from '../components/CreateGroupModal'
import type { GroupListItem, MyGroupItem, CreateGroupRequest } from '../types'

export default function StudyGroups() {
  const navigate = useNavigate()
  const [myGroups, setMyGroups] = useState<MyGroupItem[]>([])
  const [publicGroups, setPublicGroups] = useState<GroupListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // 加载我加入的小组
  const loadMyGroups = useCallback(async () => {
    try {
      const data = await groupApi.my()
      setMyGroups(data.groups)
    } catch (err) {
    }
  }, [])

  // 加载公开小组列表
  const loadPublicGroups = useCallback(async (p: number, s: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await groupApi.list(p, 20, s)
      setPublicGroups(data.groups)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载小组列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMyGroups()
  }, [loadMyGroups])

  useEffect(() => {
    loadPublicGroups(page, search)
  }, [page, search, loadPublicGroups])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleCreate = async (data: CreateGroupRequest) => {
    return await groupApi.create(data)
  }

  const handleCreated = (groupId: string) => {
    setShowCreate(false)
    loadMyGroups()
    navigate(`/groups/${groupId}`)
  }

  const handleJoin = async (groupId: string) => {
    try {
      await groupApi.join(groupId)
      await loadMyGroups()
      await loadPublicGroups(page, search)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入小组失败')
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="study-groups-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 学习小组</h1>
          <p className="page-subtitle">知识守护者联盟 - 组队学习，一起进步</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={() => setShowCreate(true)}>
          <span className="btn-icon">+</span>
          创建小组
        </button>
      </div>

      {error && (
        <div className="error-bar">
          <span>{error}</span>
          <button className="error-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* 我加入的小组 */}
      <section className="section">
        <h2 className="section-title">我加入的小组</h2>
        {myGroups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <p className="empty-text">还没有加入任何小组</p>
            <p className="empty-hint">下方找一个感兴趣的小组加入吧</p>
          </div>
        ) : (
          <div className="my-groups-grid">
            {myGroups.map((g) => (
              <div
                key={g.id}
                className="group-card my-group-card"
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <div className="group-avatar">{g.avatar}</div>
                <div className="group-info">
                  <div className="group-name-row">
                    <span className="group-name">{g.name}</span>
                    <span className={'role-badge role-' + g.role}>
                      {g.role === 'owner' ? '组长' : g.role === 'admin' ? '管理员' : '成员'}
                    </span>
                  </div>
                  <div className="group-stats">
                    <span className="stat-pill">👥 {g.memberCount}/{g.maxMembers}</span>
                    <span className="stat-pill stat-progress">📊 本周 {g.weeklyProgress} 题</span>
                  </div>
                </div>
                <div className="group-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 搜索框 */}
      <section className="section">
        <h2 className="section-title">发现小组</h2>
        <div className="search-bar">
          <input
            className="input search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索小组名称..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
          />
          <button className="btn btn-primary search-btn" onClick={handleSearch}>搜索</button>
          {search && (
            <button className="btn btn-secondary clear-btn" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
              清除
            </button>
          )}
        </div>

        {loading && <p className="loading-text">加载中...</p>}

        {!loading && publicGroups.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p className="empty-text">{search ? '没有找到匹配的小组' : '暂无公开小组'}</p>
          </div>
        )}

        {!loading && publicGroups.length > 0 && (
          <>
            <div className="public-groups-grid">
              {publicGroups.map((g) => {
                const isMember = myGroups.some((mg) => mg.id === g.id)
                return (
                  <div key={g.id} className="group-card public-group-card">
                    <div
                      className="group-card-head"
                      onClick={() => navigate(`/groups/${g.id}`)}
                    >
                      <div className="group-avatar">{g.avatar}</div>
                      <div className="group-info">
                        <div className="group-name">{g.name}</div>
                        <div className="group-owner">组长：{g.ownerName}</div>
                      </div>
                    </div>
                    {g.description && (
                      <p className="group-description">{g.description}</p>
                    )}
                    <div className="group-card-footer">
                      <span className="member-count">👥 {g.memberCount}/{g.maxMembers} 成员</span>
                      {isMember ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/groups/${g.id}`)}>
                          查看
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleJoin(g.id)}
                          disabled={g.memberCount >= g.maxMembers}
                        >
                          {g.memberCount >= g.maxMembers ? '已满' : '加入'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  上一页
                </button>
                <span className="page-info">第 {page} / {totalPages} 页 (共 {total} 个)</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <CreateGroupModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        onCreate={handleCreate}
      />

      <style>{`
        .study-groups-page {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .page-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 4px 0 0;
        }
        .create-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          font-weight: 600;
        }
        .btn-icon {
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
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
        .section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .empty-state {
          padding: 40px 24px;
          text-align: center;
          background: var(--bg-card);
          border: 1px dashed var(--border);
          border-radius: var(--radius-lg);
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .empty-text {
          font-size: 15px;
          color: var(--text-secondary);
          font-weight: 500;
          margin: 0 0 4px;
        }
        .empty-hint {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }
        .my-groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 12px;
        }
        .group-card {
          padding: 16px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          transition: all 0.2s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .my-group-card {
          cursor: pointer;
        }
        .my-group-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }
        .group-avatar {
          font-size: 36px;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-muted);
          border-radius: var(--radius-lg);
          flex-shrink: 0;
        }
        .group-info {
          flex: 1;
          min-width: 0;
        }
        .group-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .group-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .role-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: var(--radius-full, 999px);
          flex-shrink: 0;
        }
        .role-owner { background: var(--warning-light); color: var(--warning); }
        .role-admin { background: var(--primary-light); color: var(--primary); }
        .role-member { background: var(--bg-muted); color: var(--text-secondary); }
        .group-stats {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .stat-pill {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg-muted);
          padding: 3px 10px;
          border-radius: var(--radius-full, 999px);
        }
        .stat-progress {
          color: var(--primary);
          background: var(--primary-light);
          font-weight: 600;
        }
        .group-arrow {
          color: var(--text-muted);
          font-size: 18px;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .my-group-card:hover .group-arrow {
          transform: translateX(4px);
          color: var(--primary);
        }
        .search-bar {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .search-input {
          flex: 1;
          padding: 10px 14px;
        }
        .search-btn, .clear-btn {
          padding: 10px 18px;
          font-weight: 500;
        }
        .loading-text {
          padding: 24px;
          text-align: center;
          color: var(--text-secondary);
        }
        .public-groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .public-group-card {
          flex-direction: column;
          align-items: stretch;
          padding: 16px;
        }
        .group-card-head {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          margin-bottom: 10px;
        }
        .group-owner {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .group-description {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .group-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }
        .member-count {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .btn-sm {
          padding: 6px 14px;
          font-size: 13px;
        }
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 16px;
        }
        .page-info {
          font-size: 13px;
          color: var(--text-secondary);
        }
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: stretch;
          }
          .create-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
