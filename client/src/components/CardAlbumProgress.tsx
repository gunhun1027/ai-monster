// 卡片图鉴进度 - 展示收集完成度与稀有度分布
interface CardAlbumProgressProps {
  collected: number
  total: number
  byRarity: {
    common: number
    rare: number
    epic: number
    legendary: number
  }
}

const RARITY_META: Record<string, { label: string; color: string; icon: string }> = {
  common: { label: '普通', color: 'var(--text-secondary)', icon: '⚪' },
  rare: { label: '稀有', color: 'var(--info)', icon: '🔵' },
  epic: { label: '史诗', color: 'var(--primary)', icon: '🟣' },
  legendary: { label: '传说', color: 'var(--warning)', icon: '🟡' },
}

export default function CardAlbumProgress({ collected, total, byRarity }: CardAlbumProgressProps) {
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0

  return (
    <div className="album-progress">
      <div className="ap-header">
        <div className="ap-title">图鉴进度</div>
        <div className="ap-count">{collected} / {total}</div>
      </div>

      <div className="ap-bar-track">
        <div className="ap-bar-fill" style={{ width: `${pct}%` }}>
          <span className="ap-bar-pct">{pct}%</span>
        </div>
      </div>

      <div className="ap-rarity-grid">
        {(['common', 'rare', 'epic', 'legendary'] as const).map((r) => {
          const m = RARITY_META[r]
          return (
            <div key={r} className="ap-rarity-item" style={{ '--rarity-color': m.color } as React.CSSProperties}>
              <span className="ap-rarity-icon">{m.icon}</span>
              <span className="ap-rarity-label">{m.label}</span>
              <span className="ap-rarity-count">{byRarity[r] || 0}</span>
            </div>
          )
        })}
      </div>

      <style>{`
        .album-progress {
          padding: 20px;
          background: var(--bg-card);
          border-radius: var(--radius-lg, 20px);
          border: 1px solid var(--border, color-mix(in srgb, var(--text-primary) 8%, transparent));
        }
        .ap-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .ap-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .ap-count {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary);
        }
        .ap-bar-track {
          height: 24px;
          background: var(--bg-muted);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
          margin-bottom: 16px;
        }
        .ap-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--warning) 70%, transparent));
          border-radius: 999px;
          transition: width 0.6s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-width: 36px;
        }
        .ap-bar-pct {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-on-primary);
          padding-right: 8px;
        }
        .ap-rarity-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .ap-rarity-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 4px;
          background: var(--bg-muted);
          border-radius: 12px;
          border-top: 2px solid var(--rarity-color, var(--text-secondary));
        }
        .ap-rarity-icon { font-size: 16px; }
        .ap-rarity-label {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .ap-rarity-count {
          font-size: 18px;
          font-weight: 700;
          color: var(--rarity-color, var(--text-primary));
        }
        @media (max-width: 480px) {
          .ap-rarity-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}
