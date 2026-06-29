// 剧情路线追踪器 - 显示当前路线倾向与进度
import type { StoryRouteType } from '../types'

interface StoryRouteTrackerProps {
  route: StoryRouteType
  braveCount?: number
  cultivationCount?: number
  balancedCount?: number
  compact?: boolean
}

const ROUTE_META: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  brave: { label: '勇者之路', icon: '⚔️', color: 'var(--danger)', desc: '追求极限，敢于挑战' },
  cultivation: { label: '修行之路', icon: '🧘', color: 'var(--info)', desc: '稳扎稳打，厚积薄发' },
  balanced: { label: '平衡之道', icon: '☯️', color: 'var(--success)', desc: '顺应自然，从容应对' },
  none: { label: '未选择', icon: '🌱', color: 'var(--text-secondary)', desc: '做出你的第一个选择' },
}

export default function StoryRouteTracker({ route, braveCount = 0, cultivationCount = 0, balancedCount = 0, compact = false }: StoryRouteTrackerProps) {
  const meta = ROUTE_META[route] || ROUTE_META.none
  const total = braveCount + cultivationCount + balancedCount

  if (compact) {
    return (
      <span className="route-tracker-compact" style={{ color: meta.color }}>
        <span className="rt-icon">{meta.icon}</span>
        <span>{meta.label}</span>
        <style>{`
          .route-tracker-compact {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .rt-icon { font-size: 13px; }
        `}</style>
      </span>
    )
  }

  return (
    <div className="route-tracker" style={{ '--route-color': meta.color } as React.CSSProperties}>
      <div className="rt-header">
        <span className="rt-icon-lg">{meta.icon}</span>
        <div className="rt-info">
          <div className="rt-label" style={{ color: meta.color }}>{meta.label}</div>
          <div className="rt-desc">{meta.desc}</div>
        </div>
      </div>

      {total > 0 && (
        <div className="rt-bars">
          {(['brave', 'cultivation', 'balanced'] as const).map((r) => {
            const count = r === 'brave' ? braveCount : r === 'cultivation' ? cultivationCount : balancedCount
            const m = ROUTE_META[r]
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={r} className="rt-bar-row">
                <span className="rt-bar-label">{m.icon} {m.label}</span>
                <div className="rt-bar-track">
                  <div className="rt-bar-fill" style={{ width: `${pct}%`, background: m.color }} />
                </div>
                <span className="rt-bar-count">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .route-tracker {
          padding: 16px;
          background: var(--bg-card);
          border-radius: var(--radius-lg, 20px);
          border: 1px solid var(--border, color-mix(in srgb, var(--text-primary) 8%, transparent));
        }
        .rt-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .rt-icon-lg {
          font-size: 36px;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--route-color, var(--primary)) 12%, var(--bg-muted));
          border-radius: 16px;
        }
        .rt-info { flex: 1; }
        .rt-label {
          font-size: 16px;
          font-weight: 700;
        }
        .rt-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .rt-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rt-bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
        }
        .rt-bar-label {
          width: 110px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .rt-bar-track {
          flex: 1;
          height: 8px;
          background: var(--bg-muted);
          border-radius: 999px;
          overflow: hidden;
        }
        .rt-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
        }
        .rt-bar-count {
          width: 24px;
          text-align: right;
          font-weight: 600;
          color: var(--text-primary);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
