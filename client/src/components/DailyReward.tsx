// 每日奖励签到组件 - 7天连续签到奖励
import { useState, useEffect, useCallback } from 'react'
import { rewardsApi } from '../services/api'
import type { DailyRewardStatus } from '../types'

interface DailyRewardProps {
  onCoinsUpdate?: (coins: number) => void
}

const REWARD_LABELS: Record<number, string> = {
  1: '10',
  2: '20',
  3: '30+🍎',
  4: '40',
  5: '50',
  6: '60+🐟',
  7: '100+⚡',
}

export default function DailyReward({ onCoinsUpdate }: DailyRewardProps) {
  const [status, setStatus] = useState<DailyRewardStatus | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [floatText, setFloatText] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await rewardsApi.daily()
      setStatus(data)
    } catch {
      // 静默失败
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleClaim = async () => {
    if (!status?.canClaim || claiming) return
    setClaiming(true)
    try {
      const result = await rewardsApi.claim()
      setStatus((prev) =>
        prev
          ? { ...prev, canClaim: false, todayReward: { ...prev.todayReward, claimed: true } }
          : prev
      )
      onCoinsUpdate?.(result.newCoins)
      setShowParticles(true)
      setFloatText(`+${result.message}`)
      setTimeout(() => {
        setShowParticles(false)
        setFloatText(null)
      }, 2000)
    } catch {
      // 领取失败
    } finally {
      setClaiming(false)
    }
  }

  if (!status) return null

  const { todayReward, canClaim } = status
  const isBroken = todayReward.dayStreak === 1 && !todayReward.claimed && status.weekHistory?.some(h => h.claimed)

  return (
    <div className="daily-reward-wrap">
      <div className="daily-reward-title">
        <span>每日签到</span>
        {isBroken && (
          <span className="daily-broken-hint">已断签，重新开始</span>
        )}
      </div>

      <div className="daily-reward-grid">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isPast = day < todayReward.dayStreak
          const isToday = day === todayReward.dayStreak
          const isFuture = day > todayReward.dayStreak

          return (
            <div
              key={day}
              className={
                'daily-day' +
                (isPast ? ' past' : '') +
                (isToday ? ' today' : '') +
                (isFuture ? ' future' : '')
              }
            >
              <div className="daily-day-label">第{day}天</div>
              <div className="daily-day-reward">💰{REWARD_LABELS[day]}</div>
              <div className="daily-day-status">
                {isPast ? (
                  <span className="daily-check">✓</span>
                ) : isToday ? (
                  <span className="daily-current">{todayReward.claimed ? '✓' : day}</span>
                ) : (
                  <span className="daily-locked">{day}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="daily-claim-wrap">
        {canClaim ? (
          <button className="btn btn-primary daily-claim-btn" onClick={handleClaim} disabled={claiming}>
            {claiming ? '领取中...' : '领取奖励'}
          </button>
        ) : todayReward.claimed ? (
          <button className="btn btn-secondary daily-claim-btn" disabled>
            已领取
          </button>
        ) : null}
      </div>

      {/* 金币飞溅动画 */}
      {showParticles && (
        <div className="daily-particles">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="daily-particle"
              style={{
                left: `${40 + Math.random() * 20}%`,
                animationDelay: `${i * 0.08}s`,
                '--tx': `${(Math.random() - 0.5) * 120}px`,
                '--ty': `${-40 - Math.random() * 60}px`,
              } as React.CSSProperties}
            >
              💰
            </span>
          ))}
        </div>
      )}

      {/* 浮动文字 */}
      {floatText && <div className="daily-float-text">{floatText}</div>}

      <style>{`
        .daily-reward-wrap {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: background 0.3s, border-color 0.3s;
        }
        .daily-reward-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .daily-broken-hint {
          font-size: 12px;
          font-weight: 400;
          color: var(--danger);
        }
        .daily-reward-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 16px;
        }
        .daily-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 4px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--bg-muted);
          transition: all 0.2s var(--ease-slide);
        }
        .daily-day.past {
          background: var(--success-light);
          border-color: var(--success);
        }
        .daily-day.today {
          background: var(--primary-light);
          border-color: var(--primary);
          animation: today-pulse 2s ease-in-out infinite;
        }
        .daily-day.future {
          opacity: 0.5;
        }
        @keyframes today-pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 30%, transparent); }
          50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 0%, transparent); }
        }
        .daily-day-label {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .daily-day.past .daily-day-label { color: var(--success-text, var(--success)); }
        .daily-day.today .daily-day-label { color: var(--primary-text, var(--primary)); }
        .daily-day-reward {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .daily-day.past .daily-day-reward { color: var(--success-text, var(--success)); }
        .daily-day.today .daily-day-reward { color: var(--primary-text, var(--primary)); }
        .daily-day-status {
          margin-top: 2px;
        }
        .daily-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--success);
          color: var(--text-on-primary);
          font-size: 12px;
          font-weight: 700;
        }
        .daily-current {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--primary);
          color: var(--text-on-primary);
          font-size: 12px;
          font-weight: 700;
        }
        .daily-locked {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--bg-hover);
          color: var(--text-muted);
          font-size: 12px;
        }
        .daily-claim-wrap {
          text-align: center;
        }
        .daily-claim-btn {
          width: 100%;
          padding: 10px;
        }
        .daily-particles {
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          pointer-events: none;
          z-index: 5;
        }
        .daily-particle {
          position: absolute;
          font-size: 20px;
          animation: particle-fly 1.5s var(--ease-spring) forwards;
          opacity: 0;
        }
        @keyframes particle-fly {
          0% { opacity: 1; transform: translate(0, 0) scale(0.5); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1.2); }
        }
        .daily-float-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
          font-weight: 700;
          color: var(--warning);
          animation: float-up 2s var(--ease-slide) forwards;
          pointer-events: none;
          z-index: 6;
          white-space: nowrap;
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -40px); }
        }
      `}</style>
    </div>
  )
}
