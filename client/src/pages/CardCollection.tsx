// 知识卡片图鉴页面 - 展示收集进度与卡片详情
import { useState, useEffect, useCallback, useMemo } from 'react'
import { cardApi } from '../services/api'
import CardAlbumProgress from '../components/CardAlbumProgress'
import type { CardListItem, CardCollectionResponse, CardsListResponse } from '../types'

type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary'

const RARITY_META: Record<string, { label: string; color: string }> = {
  common: { label: '普通', color: '#64748b' },
  rare: { label: '稀有', color: '#3b82f6' },
  epic: { label: '史诗', color: '#a855f7' },
  legendary: { label: '传说', color: '#f59e0b' },
}

const FILTERS: { id: RarityFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'common', label: '普通' },
  { id: 'rare', label: '稀有' },
  { id: 'epic', label: '史诗' },
  { id: 'legendary', label: '传说' },
]

export default function CardCollection() {
  const [allCards, setAllCards] = useState<CardListItem[]>([])
  const [collection, setCollection] = useState<CardCollectionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const collectedIds = useMemo(() => {
    const set = new Set<string>()
    collection?.collected.forEach((c) => set.add(c.cardId))
    return set
  }, [collection])

  const collectedCounts = useMemo(() => {
    const map = new Map<string, number>()
    collection?.collected.forEach((c) => map.set(c.cardId, c.count))
    return map
  }, [collection])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listRes, colRes] = await Promise.all([cardApi.list(), cardApi.collection()])
      setAllCards(listRes.cards)
      setCollection(colRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredCards = useMemo(() => {
    if (rarityFilter === 'all') return allCards
    return allCards.filter((c) => c.rarity === rarityFilter)
  }, [allCards, rarityFilter])

  const selectedCard = selectedCardId ? allCards.find((c) => c.id === selectedCardId) : null

  return (
    <div className="card-collection-page">
      <div className="ccp-header">
        <h1>📇 知识卡片图鉴</h1>
        <p className="ccp-subtitle">收集知识卡片，解锁每一张卡片背后的趣味故事</p>
      </div>

      {collection && (
        <CardAlbumProgress
          collected={collection.collectedCount}
          total={collection.totalCards}
          byRarity={collection.byRarity}
        />
      )}

      {/* 稀有度筛选 */}
      <div className="ccp-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`ccp-filter${rarityFilter === f.id ? ' active' : ''}`}
            onClick={() => setRarityFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="ccp-loading">加载中...</div>}
      {error && <div className="ccp-error">{error}</div>}

      {/* 卡片网格 */}
      {!loading && !error && (
        <div className="ccp-grid">
          {filteredCards.map((card) => {
            const isCollected = collectedIds.has(card.id)
            const count = collectedCounts.get(card.id) || 0
            const meta = RARITY_META[card.rarity] || RARITY_META.common
            return (
              <div
                key={card.id}
                className={`ccp-card${isCollected ? '' : ' uncollected'}${count > 1 ? ' duplicate' : ''}`}
                style={{ '--card-color': meta.color, '--theme-color': card.themeColor } as React.CSSProperties}
                onClick={() => setSelectedCardId(card.id)}
              >
                {count > 1 && <span className="ccp-card-count">×{count}</span>}
                {!isCollected && <div className="ccp-card-lock">🔒</div>}
                <div className="ccp-card-rarity">{meta.label}</div>
                <div className="ccp-card-icon">{isCollected ? card.icon : '❓'}</div>
                <div className="ccp-card-name">{isCollected ? card.name : '未收集'}</div>
                <div className="ccp-card-subject">{card.subjectName}</div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && filteredCards.length === 0 && (
        <div className="ccp-empty">该稀有度下暂无卡片</div>
      )}

      {/* 卡片详情弹窗 */}
      {selectedCard && (
        <div className="ccp-detail-overlay" onClick={() => setSelectedCardId(null)}>
          <div className="ccp-detail" onClick={(e) => e.stopPropagation()} style={{ '--theme-color': selectedCard.themeColor } as React.CSSProperties}>
            <button className="ccp-detail-close" onClick={() => setSelectedCardId(null)}>×</button>
            <div className="ccp-detail-rarity" style={{ background: RARITY_META[selectedCard.rarity]?.color }}>
              {RARITY_META[selectedCard.rarity]?.label}
            </div>
            <div className="ccp-detail-icon">{selectedCard.icon}</div>
            <div className="ccp-detail-name">{selectedCard.name}</div>
            <div className="ccp-detail-subject">{selectedCard.subjectName}</div>
            <div className="ccp-detail-content">{selectedCard.content}</div>
            {selectedCard.funFact && (
              <div className="ccp-detail-fun">💡 {selectedCard.funFact}</div>
            )}
            <div className="ccp-detail-status">
              {collectedIds.has(selectedCard.id) ? (
                <span className="ccp-status-collected">已收集 ×{collectedCounts.get(selectedCard.id) || 1}</span>
              ) : (
                <span className="ccp-status-uncollected">尚未收集</span>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .card-collection-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px 40px;
        }
        .ccp-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .ccp-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px;
        }
        .ccp-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }
        .ccp-filters {
          display: flex;
          gap: 8px;
          margin: 20px 0;
          flex-wrap: wrap;
        }
        .ccp-filter {
          padding: 6px 16px;
          border: 1px solid var(--border, rgba(0,0,0,0.08));
          background: var(--bg-card);
          color: var(--text-secondary);
          border-radius: 999px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ccp-filter:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .ccp-filter.active {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }
        .ccp-loading, .ccp-error, .ccp-empty {
          padding: 48px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .ccp-error { color: var(--danger, #ef4444); }
        .ccp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
        }
        .ccp-card {
          position: relative;
          padding: 16px 12px;
          background: var(--bg-card);
          border: 2px solid var(--card-color, #64748b);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          overflow: hidden;
        }
        .ccp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px color-mix(in srgb, var(--card-color) 30%, transparent);
        }
        .ccp-card.uncollected {
          border-style: dashed;
          opacity: 0.7;
        }
        .ccp-card.duplicate::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 70%, color-mix(in srgb, var(--primary) 20%, transparent));
          pointer-events: none;
        }
        .ccp-card-count {
          position: absolute;
          top: 6px;
          right: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--primary);
          color: #fff;
          z-index: 1;
        }
        .ccp-card-lock {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 32px;
          opacity: 0.4;
        }
        .ccp-card-rarity {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--card-color, #64748b);
          color: #fff;
          display: inline-block;
          margin-bottom: 8px;
        }
        .ccp-card-icon {
          font-size: 36px;
          margin-bottom: 8px;
        }
        .ccp-card-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .ccp-card-subject {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .ccp-detail-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          animation: ccpFade 0.2s ease;
        }
        @keyframes ccpFade { from { opacity: 0; } to { opacity: 1; } }
        .ccp-detail {
          position: relative;
          width: 90%;
          max-width: 420px;
          padding: 28px 24px;
          background: var(--bg-card);
          border-radius: var(--radius-lg, 20px);
          border: 2px solid var(--theme-color, var(--primary));
          box-shadow: 0 0 32px color-mix(in srgb, var(--theme-color, var(--primary)) 30%, transparent);
          text-align: center;
          animation: ccpPop 0.3s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
        }
        @keyframes ccpPop {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .ccp-detail-close {
          position: absolute;
          top: 12px;
          right: 12px;
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
        .ccp-detail-close:hover { background: var(--danger-light); color: var(--danger); }
        .ccp-detail-rarity {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 12px;
          border-radius: 999px;
          color: var(--text-on-primary);
          display: inline-block;
          margin-bottom: 12px;
        }
        .ccp-detail-icon {
          font-size: 56px;
          margin-bottom: 12px;
        }
        .ccp-detail-name {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .ccp-detail-subject {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        .ccp-detail-content {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-primary);
          padding: 16px;
          background: var(--bg-muted);
          border-radius: 12px;
          margin-bottom: 12px;
          text-align: left;
        }
        .ccp-detail-fun {
          font-size: 13px;
          color: var(--text-secondary);
          padding: 12px 16px;
          background: color-mix(in srgb, var(--warning, #f59e0b) 8%, var(--bg-muted));
          border-radius: 12px;
          text-align: left;
          line-height: 1.6;
        }
        .ccp-detail-status {
          margin-top: 16px;
          font-size: 13px;
          font-weight: 600;
        }
        .ccp-status-collected { color: var(--success, #10b981); }
        .ccp-status-uncollected { color: var(--text-secondary); }
      `}</style>
    </div>
  )
}
