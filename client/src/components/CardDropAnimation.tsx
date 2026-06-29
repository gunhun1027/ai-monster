// 卡片掉落动画 - 答题/通关后展示获得的卡片
import { useState, useEffect } from 'react'
import type { DroppedCardInfo } from '../types'

interface CardDropAnimationProps {
  cards: DroppedCardInfo[]
  onComplete: () => void
}

const RARITY_META: Record<string, { label: string; glow: string; ring: string }> = {
  common: { label: '普通', glow: 'color-mix(in srgb, var(--text-secondary) 50%, transparent)', ring: 'var(--text-secondary)' },
  rare: { label: '稀有', glow: 'color-mix(in srgb, var(--info) 60%, transparent)', ring: 'var(--info)' },
  epic: { label: '史诗', glow: 'color-mix(in srgb, var(--primary) 70%, transparent)', ring: 'var(--primary)' },
  legendary: { label: '传说', glow: 'color-mix(in srgb, var(--warning) 80%, transparent)', ring: 'var(--warning)' },
}

export default function CardDropAnimation({ cards, onComplete }: CardDropAnimationProps) {
  const [revealedCount, setRevealedCount] = useState(0)

  // 逐张揭示卡片
  useEffect(() => {
    if (revealedCount >= cards.length) return
    const timer = setTimeout(() => {
      setRevealedCount((prev) => prev + 1)
    }, revealedCount === 0 ? 200 : 600)
    return () => clearTimeout(timer)
  }, [revealedCount, cards.length])

  const allRevealed = revealedCount >= cards.length

  return (
    <div className="card-drop-overlay">
      <div className="card-drop-container">
        <div className="card-drop-title">
          {cards.length > 1 ? `获得 ${cards.length} 张知识卡片！` : '获得知识卡片！'}
        </div>

        <div className="card-drop-cards">
          {cards.map((card, idx) => {
            const meta = RARITY_META[card.rarity] || RARITY_META.common
            const isRevealed = idx < revealedCount
            return (
              <div
                key={`${card.cardId}-${idx}`}
                className={`drop-card${isRevealed ? ' revealed' : ''}`}
                style={{ '--card-glow': meta.glow, '--card-ring': meta.ring, '--card-theme': card.themeColor } as React.CSSProperties}
              >
                {isRevealed ? (
                  <>
                    <div className="drop-card-rarity">{meta.label}</div>
                    <div className="drop-card-icon">{card.icon}</div>
                    <div className="drop-card-name">{card.name}</div>
                    <div className="drop-card-content">{card.content}</div>
                    {card.isNew && <div className="drop-card-new">NEW</div>}
                    {card.funFact && <div className="drop-card-fun">💡 {card.funFact}</div>}
                  </>
                ) : (
                  <div className="drop-card-back">？</div>
                )}
              </div>
            )
          })}
        </div>

        {allRevealed && (
          <button className="btn btn-primary card-drop-confirm" onClick={onComplete}>
            收下卡片
          </button>
        )}
      </div>

      <style>{`
        .card-drop-overlay {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--text-primary) 75%, transparent);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1150;
          animation: cdFadeIn 0.3s ease;
        }
        @keyframes cdFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .card-drop-container {
          width: 90%;
          max-width: 640px;
          text-align: center;
        }
        .card-drop-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-on-primary);
          margin-bottom: 24px;
          text-shadow: 0 2px 8px color-mix(in srgb, var(--text-primary) 50%, transparent);
          animation: cdTitlePop 0.5s ease;
        }
        @keyframes cdTitlePop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .card-drop-cards {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
          margin-bottom: 24px;
        }
        .drop-card {
          width: 180px;
          min-height: 240px;
          padding: 16px 14px;
          background: var(--bg-card);
          border-radius: 16px;
          border: 2px solid var(--card-ring, var(--text-secondary));
          box-shadow: 0 0 24px var(--card-glow, transparent);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          transform: translateY(40px) scale(0.9) rotateY(90deg);
          transition: all 0.5s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
        }
        .drop-card.revealed {
          opacity: 1;
          transform: translateY(0) scale(1) rotateY(0);
        }
        .drop-card-back {
          font-size: 48px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          width: 100%;
        }
        .drop-card-rarity {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 999px;
          background: var(--card-ring, var(--text-secondary));
          color: var(--text-on-primary);
          margin-bottom: 8px;
        }
        .drop-card-icon {
          font-size: 40px;
          margin-bottom: 8px;
        }
        .drop-card-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
          text-align: center;
        }
        .drop-card-content {
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-secondary);
          text-align: center;
          margin-bottom: 8px;
        }
        .drop-card-new {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--danger);
          color: var(--text-on-primary);
          animation: cdNewPulse 1s ease infinite;
        }
        @keyframes cdNewPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .drop-card-fun {
          font-size: 11px;
          color: var(--text-tertiary, var(--text-secondary));
          text-align: center;
          line-height: 1.4;
          padding-top: 8px;
          border-top: 1px solid var(--border, color-mix(in srgb, var(--text-primary) 8%, transparent));
          width: 100%;
        }
        .card-drop-confirm {
          padding: 10px 32px;
          font-size: 14px;
          animation: cdBtnIn 0.3s ease;
        }
        @keyframes cdBtnIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
