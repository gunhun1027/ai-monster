// 用户称号徽章 - 显示当前称号，点击可切换
import { useState, useEffect, useCallback, useRef } from 'react'
import { titleApi } from '../services/api'
import type { TitleDef, TitlesResponse } from '../types'

interface UserTitleBadgeProps {
  title: string // 当前称号名称
  onTitleChange?: (newTitle: string) => void
}

export default function UserTitleBadge({ title, onTitleChange }: UserTitleBadgeProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<TitlesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [equipping, setEquipping] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // 卸载时清理未完成的 setTimeout
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await titleApi.list()
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && !data) loadData()
  }, [open, data, loadData])

  const handleEquip = async (titleId: string) => {
    if (equipping) return
    setEquipping(titleId)
    setError(null)
    try {
      const res = await titleApi.equip(titleId)
      if (data) setData({ ...data, currentTitle: res.currentTitle })
      if (onTitleChange) onTitleChange(res.currentTitle)
      timerRef.current = setTimeout(() => setOpen(false), 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : '装备失败')
    } finally {
      setEquipping(null)
    }
  }

  // 查找当前称号的颜色（在 allTitles 中找名称匹配的）
  const currentTitleDef = data?.allTitles.find((t) => t.name === title)

  return (
    <>
      <button
        className="user-title-badge"
        onClick={() => setOpen(true)}
        style={currentTitleDef ? { '--title-color': currentTitleDef.color } as React.CSSProperties : undefined}
      >
        {currentTitleDef ? (
          <>
            <span className="utb-icon">{currentTitleDef.icon}</span>
            <span className="utb-name">{title}</span>
          </>
        ) : (
          <span className="utb-name">{title || '知识新手'}</span>
        )}
      </button>

      {open && (
        <div className="user-title-overlay" onClick={() => setOpen(false)}>
          <div className="user-title-panel" onClick={(e) => e.stopPropagation()}>
            <div className="utp-header">
              <h3>我的称号</h3>
              <button className="utp-close" onClick={() => setOpen(false)}>×</button>
            </div>

            {loading && <div className="utp-loading">加载中...</div>}
            {error && <div className="utp-error">{error}</div>}

            {data && (
              <div className="utp-list">
                {data.allTitles.map((t: TitleDef) => {
                  const isUnlocked = data.unlockedTitles.includes(t.id)
                  const isCurrent = t.name === data.currentTitle
                  return (
                    <div
                      key={t.id}
                      className={`utp-item${isCurrent ? ' current' : ''}${!isUnlocked ? ' locked' : ''}`}
                      style={{ '--title-color': t.color } as React.CSSProperties}
                    >
                      <div className="utp-item-icon">{t.icon}</div>
                      <div className="utp-item-info">
                        <div className="utp-item-name">{t.name}{isCurrent && <span className="utp-equipped">已装备</span>}</div>
                        <div className="utp-item-desc">{t.desc}</div>
                      </div>
                      {isUnlocked && !isCurrent && (
                        <button
                          className="btn btn-primary utp-equip"
                          disabled={equipping === t.id}
                          onClick={() => handleEquip(t.id)}
                        >
                          {equipping === t.id ? '装备中' : '装备'}
                        </button>
                      )}
                      {!isUnlocked && <span className="utp-locked-tag">未解锁</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .user-title-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border: 1px solid var(--title-color, var(--primary));
          background: color-mix(in srgb, var(--title-color, var(--primary)) 12%, transparent);
          color: var(--title-color, var(--primary));
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .user-title-badge:hover {
          background: color-mix(in srgb, var(--title-color, var(--primary)) 20%, transparent);
          transform: translateY(-1px);
        }
        .utb-icon { font-size: 13px; }

        .user-title-overlay {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--text-primary) 50%, transparent);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          animation: utFadeIn 0.2s ease;
        }
        @keyframes utFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .user-title-panel {
          width: 90%;
          max-width: 480px;
          max-height: 80vh;
          overflow-y: auto;
          background: var(--bg-card);
          border-radius: var(--radius-lg, 20px);
          box-shadow: var(--shadow-float);
          padding: 20px;
          animation: utSlide 0.3s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
        }
        @keyframes utSlide {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .utp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .utp-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .utp-close {
          width: 28px;
          height: 28px;
          border: none;
          background: var(--bg-muted);
          color: var(--text-secondary);
          font-size: 18px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .utp-close:hover { background: var(--danger-light); color: var(--danger); }
        .utp-loading, .utp-error {
          padding: 24px;
          text-align: center;
          color: var(--text-secondary);
        }
        .utp-error { color: var(--danger); }
        .utp-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .utp-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 2px solid var(--border, color-mix(in srgb, var(--text-primary) 8%, transparent));
          border-radius: 14px;
          background: var(--bg-card);
          transition: all 0.2s;
        }
        .utp-item.current {
          border-color: var(--title-color, var(--primary));
          background: color-mix(in srgb, var(--title-color, var(--primary)) 8%, var(--bg-card));
        }
        .utp-item.locked { opacity: 0.55; }
        .utp-item-icon {
          font-size: 28px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-muted);
          border-radius: 12px;
          flex-shrink: 0;
        }
        .utp-item-info { flex: 1; min-width: 0; }
        .utp-item-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .utp-equipped {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--success);
          color: var(--text-on-primary);
        }
        .utp-item-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .utp-equip {
          padding: 6px 14px;
          font-size: 12px;
          flex-shrink: 0;
        }
        .utp-locked-tag {
          font-size: 11px;
          color: var(--text-tertiary, var(--text-secondary));
          padding: 4px 10px;
          background: var(--bg-muted);
          border-radius: 999px;
          flex-shrink: 0;
        }
      `}</style>
    </>
  )
}
