// 排行榜页面 - 带胶囊拖拽切换
import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../hooks/useGame'
import { useCapsuleControl } from '../hooks/useCapsuleControl'
import type { RankingItem, MyRank } from '../types'

type RankType = 'level' | 'streak' | 'correct' | 'combo'

const RANK_TABS: { key: RankType; label: string; unit: string }[] = [
  { key: 'level', label: '等级', unit: 'Lv' },
  { key: 'streak', label: '连胜', unit: '天' },
  { key: 'correct', label: '答对数', unit: '题' },
  { key: 'combo', label: '最高连击', unit: '连击' },
]

const TOP3_COLORS: Record<number, string> = {
  1: '#d97706',
  2: '#64748b',
  3: '#b45309',
}

export default function Ranking() {
  const { ranking, loading, error, fetchRanking, setError } = useGame()

  const [rankType, setRankType] = useState<RankType>('level')
  const [myRank, setMyRank] = useState<MyRank | null>(null)

  const activeTabIndex = RANK_TABS.findIndex((t) => t.key === rankType)
  const safeTabIndex = activeTabIndex >= 0 ? activeTabIndex : 0

  const handleTabActivate = useCallback((index: number) => {
    const tab = RANK_TABS[index]
    if (tab) setRankType(tab.key)
  }, [])

  const { containerRef: tabsContainerRef, indicatorRef: tabsIndicatorRef, displayIndex, indicatorProgress } = useCapsuleControl({
    itemCount: RANK_TABS.length,
    activeIndex: safeTabIndex,
    onActivate: handleTabActivate,
  })

  // 根据 indicatorProgress 计算每个 tab 的颜色：在指示器范围内为 active 色，否则为 secondary 色
  const getTabColor = (index: number): string => {
    const distance = Math.abs(indicatorProgress - index)
    if (distance < 0.5) return 'var(--text-on-primary)'
    if (distance < 1.0) {
      // 过渡区间：在 text-secondary 和 text-on-primary 之间插值
      const t = distance - 0.5 // 0~0.5
      const opacity = t * 2 // 0~1
      return opacity > 0.5 ? 'var(--text-secondary)' : 'var(--text-on-primary)'
    }
    return 'var(--text-secondary)'
  }

  const getValueByType = (item: RankingItem, type: RankType): number => {
    switch (type) {
      case 'level': return item.monsterLevel
      case 'streak': return item.streakDays
      case 'correct': return item.totalCorrect
      case 'combo': return item.maxCombo
    }
  }

  const formatValue = (item: RankingItem, type: RankType): string => {
    const v = getValueByType(item, type)
    const tab = RANK_TABS.find((t) => t.key === type)!
    if (type === 'level') return `Lv.${v}`
    return `${v} ${tab.unit}`
  }

  const formatMyRankValue = (rank: MyRank, type: RankType): string => {
    const tab = RANK_TABS.find((t) => t.key === type)!
    if (type === 'level') return `Lv.${rank.value}`
    return `${rank.value} ${tab.unit}`
  }

  useEffect(() => {
    const load = async () => {
      const result = await fetchRanking(rankType)
      setMyRank(result.myRank || null)
    }
    load()
  }, [rankType, fetchRanking])

  return (
    <div className="ranking-page">
      <h1 className="ranking-title">排行榜</h1>

      {/* 胶囊拖拽控制区 */}
      <div className="ranking-tabs" ref={tabsContainerRef}>
        <div className="sliding-indicator rank-tab-indicator" ref={tabsIndicatorRef} />
        {RANK_TABS.map((tab, index) => (
          <div
            key={tab.key}
            className={'rank-tab-item' + (index === displayIndex ? ' active' : '')}
            style={{ color: getTabColor(index) }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* 我的排名 */}
      {myRank && (
        <div className="card my-rank-card">
          <div className="my-rank-left">
            <span className="my-rank-label">我的排名</span>
            <span className="my-rank-num">#{myRank.rank}</span>
          </div>
          <div className="my-rank-right">
            <span className="my-rank-value">{formatMyRankValue(myRank, rankType)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="ranking-error-bar">
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

      {loading && <div className="ranking-loading">加载中...</div>}

      {!loading && ranking.length > 0 && (
        <div className="ranking-list">
          {ranking.map((item) => {
            const isTop3 = item.rank <= 3
            const topColor = TOP3_COLORS[item.rank]
            return (
              <div
                key={item.id}
                className={'ranking-row' + (item.isMe ? ' me' : '') + (isTop3 ? ` rank-${item.rank}` : '')}
              >
                <div className="rank-num-cell">
                  {isTop3 ? (
                    <span className="rank-badge" style={{ background: topColor, color: 'var(--text-on-primary)' }}>
                      {item.rank}
                    </span>
                  ) : (
                    <span className="rank-num">#{item.rank}</span>
                  )}
                </div>
                <div className="rank-user-cell">
                  <span className="rank-username">{item.username}</span>
                  {item.isMe && <span className="badge badge-primary" style={{fontSize:'11px',padding:'2px 8px'}}>我</span>}
                </div>
                <div className="rank-monster-cell">
                  <span className="rank-stage-text">Lv.{item.monsterLevel}</span>
                </div>
                <div className="rank-value-cell">{formatValue(item, rankType)}</div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && ranking.length === 0 && !error && (
        <div className="ranking-empty">暂无排行数据</div>
      )}

      <style>{`
        .ranking-page {
          max-width: 800px;
          margin: 0 auto;
        }
        .ranking-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          text-align: center;
          margin-bottom: 20px;
        }
        .ranking-tabs {
          position: relative;
          display: flex;
          background-color: var(--bg-muted);
          border-radius: var(--radius-full);
          padding: 4px;
          margin-bottom: 20px;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          cursor: pointer;
        }
        .rank-tab-item {
          flex: 1;
          text-align: center;
          padding: 9px 16px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          z-index: 2;
          position: relative;
          transition: color 0.3s;
          white-space: nowrap;
        }
        .rank-tab-item.active {
          color: var(--text-on-primary);
        }
        .rank-tab-indicator {
          top: 4px;
          bottom: 4px;
        }
        .my-rank-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .my-rank-left {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }
        .my-rank-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .my-rank-num {
          font-size: 28px;
          font-weight: 700;
          color: var(--primary);
        }
        .my-rank-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .my-rank-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .ranking-error-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--danger-light);
          color: var(--danger);
          border-radius: var(--radius);
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 500;
        }
        .ranking-error-bar span { flex: 1; }
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
        .ranking-loading, .ranking-empty {
          text-align: center;
          padding: 48px 16px;
          color: var(--text-secondary);
          font-size: 15px;
        }
        .ranking-list {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .ranking-row {
          display: grid;
          grid-template-columns: 56px 1fr auto auto;
          align-items: center;
          gap: 16px;
          padding: 12px 20px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .ranking-row:last-child { border-bottom: none; }
        .ranking-row:hover { background: var(--bg-hover); }
        .ranking-row.me { background: var(--primary-light); }
        .ranking-row.me:hover { background: var(--primary-light); }
        .ranking-row.rank-1, .ranking-row.rank-2, .ranking-row.rank-3 { background: var(--bg-card); }
        .rank-num-cell {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          font-size: 13px;
          font-weight: 700;
        }
        .rank-num {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .rank-user-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .rank-username {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rank-monster-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rank-stage-text {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .rank-value-cell {
          font-size: 15px;
          font-weight: 700;
          color: var(--primary);
          min-width: 80px;
          text-align: right;
        }
        @media (max-width: 600px) {
          .ranking-row {
            grid-template-columns: 44px 1fr auto;
            gap: 10px;
            padding: 10px 14px;
          }
          .rank-monster-cell { display: none; }
          .rank-value-cell { min-width: 60px; font-size: 13px; }
          .rank-tab-item { padding: 7px 10px; font-size: 13px; }
          .my-rank-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .my-rank-right { align-items: flex-start; }
        }
      `}</style>
    </div>
  )
}
