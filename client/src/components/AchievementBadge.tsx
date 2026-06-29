// 成就徽章组件 - 简约设计
import type { Achievement } from '../types'

interface AchievementBadgeProps {
  achievement: Achievement
}

export default function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const { unlocked, icon, name, description } = achievement

  return (
    <div className={'achievement-badge' + (unlocked ? ' unlocked' : ' locked')}>
      <div className="achievement-icon">
        {unlocked ? icon : '?'}
      </div>
      <div className="achievement-info">
        <h3 className="achievement-name">{name}</h3>
        <p className="achievement-desc">{description}</p>
      </div>

      <style>{`
        .achievement-badge {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--bg-card);
          transition: border-color 0.15s;
        }
        .achievement-badge.unlocked {
          border-color: var(--warning);
          background: var(--warning-light);
        }
        .achievement-badge.locked {
          opacity: 0.5;
        }
        .achievement-icon {
          font-size: 28px;
          line-height: 1;
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius);
          background: var(--bg-muted);
        }
        .achievement-badge.locked .achievement-icon {
          color: var(--text-muted);
          font-weight: 700;
          font-size: 20px;
        }
        .achievement-info {
          flex: 1;
          min-width: 0;
        }
        .achievement-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .achievement-badge.locked .achievement-name {
          color: var(--text-secondary);
        }
        .achievement-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
      `}</style>
    </div>
  )
}
