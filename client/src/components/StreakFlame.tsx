// 连续学习火焰特效组件
// 根据当前连续学习天数显示不同大小的火焰图标
// 0天：无火焰；1-6天：小火苗；7-29天：中火焰；30-99天：大火焰；100+天：超大火焰
interface StreakFlameProps {
  streak: number
}

export default function StreakFlame({ streak }: StreakFlameProps) {
  // 根据连续天数判断火焰等级
  const level = streak === 0 ? 0
    : streak < 7 ? 1
    : streak < 30 ? 2
    : streak < 100 ? 3
    : 4

  // 火焰文字
  const flameText = level === 0 ? '💤'
    : level === 1 ? '🔥'
    : level === 2 ? '🔥🔥'
    : level === 3 ? '🔥🔥🔥'
    : '🔥🔥🔥🔥'

  // 火焰标题
  const flameTitle = level === 0 ? '今天还没答题，火焰已熄灭'
    : level === 1 ? `${streak}天连续学习！火苗正在燃烧`
    : level === 2 ? `${streak}天连续学习！火焰稳定燃烧`
    : level === 3 ? `${streak}天连续学习！烈焰冲天`
    : `${streak}天连续学习！传奇火神！`

  return (
    <div className={`streak-flame streak-level-${level}`} title={flameTitle}>
      <div className="flame-icon-wrap">
        <span className="flame-icon">{flameText}</span>
        {level > 0 && (
          <span className="flame-aura" aria-hidden="true" />
        )}
      </div>
      <div className="flame-info">
        <div className="flame-streak">
          <span className="flame-num">{streak}</span>
          <span className="flame-unit">天</span>
        </div>
        <div className="flame-label">连续学习</div>
      </div>

      <style>{`
        .streak-flame {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          transition: all 0.3s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
        }
        .streak-flame.streak-level-0 {
          opacity: 0.7;
        }
        .streak-flame.streak-level-1 {
          border-color: color-mix(in srgb, var(--warning) 30%, transparent);
          box-shadow: 0 0 12px color-mix(in srgb, var(--warning) 10%, transparent);
        }
        .streak-flame.streak-level-2 {
          border-color: color-mix(in srgb, var(--warning) 40%, transparent);
          box-shadow: 0 0 20px color-mix(in srgb, var(--warning) 18%, transparent);
        }
        .streak-flame.streak-level-3 {
          border-color: color-mix(in srgb, var(--danger) 50%, transparent);
          box-shadow: 0 0 28px color-mix(in srgb, var(--danger) 25%, transparent);
        }
        .streak-flame.streak-level-4 {
          border-color: color-mix(in srgb, var(--danger) 60%, transparent);
          box-shadow: 0 0 36px color-mix(in srgb, var(--danger) 35%, transparent);
          background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--warning) 20%, transparent) 100%);
        }
        .flame-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }
        .flame-icon {
          font-size: 24px;
          line-height: 1;
          display: inline-block;
          animation: flameFlicker 1.4s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 6px color-mix(in srgb, var(--warning) 50%, transparent));
        }
        .streak-level-1 .flame-icon { font-size: 22px; }
        .streak-level-2 .flame-icon { font-size: 28px; animation-duration: 1.1s; }
        .streak-level-3 .flame-icon { font-size: 32px; animation-duration: 0.9s; }
        .streak-level-4 .flame-icon { font-size: 38px; animation-duration: 0.7s; }

        .streak-level-0 .flame-icon {
          animation: none;
          filter: grayscale(1) opacity(0.6);
        }

        .flame-aura {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--warning) 30%, transparent) 0%, transparent 70%);
          animation: auraPulse 2s ease-in-out infinite;
          pointer-events: none;
        }
        .streak-level-3 .flame-aura,
        .streak-level-4 .flame-aura {
          width: 56px;
          height: 56px;
          background: radial-gradient(circle, color-mix(in srgb, var(--danger) 40%, transparent) 0%, transparent 70%);
        }

        @keyframes flameFlicker {
          0% { transform: translateY(0) scale(1) rotate(-1deg); }
          100% { transform: translateY(-2px) scale(1.05) rotate(1deg); }
        }
        @keyframes auraPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        }

        .flame-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .flame-streak {
          display: flex;
          align-items: baseline;
          gap: 2px;
          line-height: 1;
        }
        .flame-num {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }
        .streak-level-1 .flame-num { color: var(--warning); }
        .streak-level-2 .flame-num { color: var(--warning); }
        .streak-level-3 .flame-num { color: var(--danger); }
        .streak-level-4 .flame-num { color: var(--danger); }

        .flame-unit {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .flame-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }
        @media (max-width: 480px) {
          .streak-flame {
            padding: 10px 14px;
            gap: 8px;
          }
          .flame-icon-wrap {
            width: 36px;
            height: 36px;
          }
          .streak-level-1 .flame-icon { font-size: 18px; }
          .streak-level-2 .flame-icon { font-size: 22px; }
          .streak-level-3 .flame-icon { font-size: 26px; }
          .streak-level-4 .flame-icon { font-size: 30px; }
          .flame-num { font-size: 22px; }
        }
      `}</style>
    </div>
  )
}
