// 小组目标卡片 - 显示目标进度与全组贡献可视化
import type { GroupGoalItem } from '../types'

interface GroupGoalCardProps {
  goal: GroupGoalItem
}

// 目标类型显示文案映射
const TARGET_TYPE_LABEL: Record<string, string> = {
  total_quiz: '总答题数',
  total_correct: '总正确数',
  streak_days: '连续天数',
}

// 目标类型 emoji 映射
const TARGET_TYPE_ICON: Record<string, string> = {
  total_quiz: '📝',
  total_correct: '✅',
  streak_days: '🔥',
}

export default function GroupGoalCard({ goal }: GroupGoalCardProps) {
  const percent = Math.min(100, goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0)
  const isJustCompleted = goal.isCompleted && percent >= 100

  return (
    <div className={`group-goal-card${goal.isCompleted ? ' completed' : ''}`}>
      <div className="goal-header">
        <div className="goal-icon">{TARGET_TYPE_ICON[goal.targetType] || '🎯'}</div>
        <div className="goal-title-wrap">
          <div className="goal-title">{goal.title}</div>
          <div className="goal-type">{TARGET_TYPE_LABEL[goal.targetType] || goal.targetType}</div>
        </div>
        {goal.isCompleted && (
          <div className="goal-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>已达成</span>
          </div>
        )}
      </div>

      {goal.description && (
        <p className="goal-desc">{goal.description}</p>
      )}

      {/* 进度条 - 众筹风格 */}
      <div className="goal-progress-wrap">
        <div className="goal-progress-track">
          <div
            className="goal-progress-fill"
            style={{ width: `${percent}%` }}
          />
          {/* 庆祝动画：达成时的彩色光斑 */}
          {isJustCompleted && (
            <>
              <span className="goal-confetti c1">🎉</span>
              <span className="goal-confetti c2">✨</span>
              <span className="goal-confetti c3">⭐</span>
            </>
          )}
        </div>
        <div className="goal-progress-text">
          <span className="goal-current">{goal.currentValue}</span>
          <span className="goal-sep">/</span>
          <span className="goal-target">{goal.targetValue}</span>
          <span className="goal-percent">{percent}%</span>
        </div>
      </div>

      {/* 奖励信息 */}
      <div className="goal-footer">
        <div className="goal-reward">
          <span className="reward-icon">🪙</span>
          <span className="reward-text">全组奖励 {goal.rewardCoins} 金币</span>
        </div>
        {goal.deadline && (
          <div className="goal-deadline">
            截止：{new Date(goal.deadline).toLocaleDateString('zh-CN')}
          </div>
        )}
      </div>

      <style>{`
        .group-goal-card {
          padding: 16px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          transition: all 0.2s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
          position: relative;
          overflow: hidden;
        }
        .group-goal-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }
        .group-goal-card.completed {
          border-color: var(--success);
          background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--success) 5%, transparent) 100%);
        }
        .group-goal-card.completed::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--success) 0%, color-mix(in srgb, var(--success) 70%, transparent) 100%);
        }
        .goal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .goal-icon {
          font-size: 22px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-muted);
          border-radius: var(--radius);
          flex-shrink: 0;
        }
        .goal-title-wrap {
          flex: 1;
          min-width: 0;
        }
        .goal-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .goal-type {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .goal-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: var(--success);
          color: var(--text-on-primary);
          border-radius: var(--radius-full, 999px);
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
          animation: badgePop 0.4s var(--ease-slide, cubic-bezier(0.34, 1.56, 0.64, 1));
        }
        @keyframes badgePop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .goal-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 12px;
          word-break: break-word;
        }
        .goal-progress-wrap {
          margin-bottom: 10px;
        }
        .goal-progress-track {
          position: relative;
          height: 12px;
          background: var(--bg-muted);
          border-radius: var(--radius-full, 999px);
          overflow: hidden;
        }
        .goal-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary) 0%, color-mix(in srgb, var(--success) 70%, transparent) 100%);
          border-radius: var(--radius-full, 999px);
          transition: width 0.6s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
          position: relative;
        }
        .goal-progress-fill::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--bg-card) 30%, transparent) 50%, transparent 100%);
          animation: shimmer 2s linear infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .goal-confetti {
          position: absolute;
          top: -10px;
          font-size: 14px;
          animation: confettiFall 1.5s ease-out forwards;
          pointer-events: none;
        }
        .goal-confetti.c1 { left: 30%; animation-delay: 0s; }
        .goal-confetti.c2 { left: 60%; animation-delay: 0.2s; }
        .goal-confetti.c3 { left: 80%; animation-delay: 0.4s; }
        @keyframes confettiFall {
          0% { transform: translateY(-5px) rotate(0); opacity: 1; }
          100% { transform: translateY(30px) rotate(180deg); opacity: 0; }
        }
        .goal-progress-text {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-top: 8px;
          font-variant-numeric: tabular-nums;
        }
        .goal-current {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }
        .goal-sep {
          font-size: 13px;
          color: var(--text-muted);
        }
        .goal-target {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .goal-percent {
          margin-left: auto;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--bg-muted);
          padding: 2px 8px;
          border-radius: var(--radius-full, 999px);
        }
        .goal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
        }
        .goal-reward {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--warning);
          font-weight: 600;
        }
        .reward-icon {
          font-size: 14px;
        }
        .goal-deadline {
          color: var(--text-muted);
          font-size: 11px;
        }
      `}</style>
    </div>
  )
}
