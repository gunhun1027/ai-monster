// 连胜指示组件 - 简约设计
interface StreakFireProps {
  days: number
}

export default function StreakFire({ days }: StreakFireProps) {
  if (days <= 0) return null

  return (
    <span className="streak-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
      <span>{days} 天连胜</span>

      <style>{`
        .streak-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          background: var(--warning-light);
          color: var(--warning);
        }
        .streak-badge svg {
          flex-shrink: 0;
        }
      `}</style>
    </span>
  )
}
