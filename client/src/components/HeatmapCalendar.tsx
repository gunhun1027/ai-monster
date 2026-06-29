// 学习热力图日历组件 - GitHub 风格学习贡献图
// 显示最近 52 周的学习数据，按周列布局，悬停显示具体日期与答题数
import { useMemo, useState } from 'react'
import type { HeatmapCell } from '../types'

interface HeatmapCalendarProps {
  data: HeatmapCell[]
}

interface WeekColumn {
  weekIndex: number
  days: Array<{ cell: HeatmapCell | null; dayIndex: number }>
}

// 周几标签
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

// 月份英文缩写
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const [hoverCell, setHoverCell] = useState<HeatmapCell | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  // 将线性数据按周列布局：每列7天（周一到周日）
  const { weekColumns, monthLabels } = useMemo(() => {
    if (data.length === 0) {
      return { weekColumns: [] as WeekColumn[], monthLabels: [] as Array<{ label: string; colIndex: number }> }
    }

    // 找到第一天是周几（数据按日期升序，data[0] 是最早的一天）
    const firstDate = new Date(data[0].date)
    const firstDay = firstDate.getDay() // 0=Sunday, 1=Monday, ...
    // 转为 Monday=0, Sunday=6
    const offset = firstDay === 0 ? 6 : firstDay - 1

    // 周列布局：每个 cell 分配到 (index + offset) / 7 列
    const columns: WeekColumn[] = []
    for (let i = 0; i < data.length; i++) {
      const colIdx = Math.floor((i + offset) / 7)
      const dayIdx = (i + offset) % 7
      if (!columns[colIdx]) {
        columns[colIdx] = { weekIndex: colIdx, days: Array(7).fill(null).map((_, di) => ({ cell: null, dayIndex: di })) }
      }
      columns[colIdx].days[dayIdx].cell = data[i]
    }

    // 计算月份标签位置：每列开头（dayIndex=0）对应的月份
    const monthLabels: Array<{ label: string; colIndex: number }> = []
    let lastMonth = -1
    for (let c = 0; c < columns.length; c++) {
      const firstCell = columns[c].days[0].cell
      if (firstCell) {
        const month = new Date(firstCell.date).getMonth()
        if (month !== lastMonth) {
          monthLabels.push({ label: MONTH_LABELS[month], colIndex: c })
          lastMonth = month
        }
      }
    }

    return { weekColumns: columns, monthLabels }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="heatmap-empty">暂无学习记录，开始答题点亮你的学习日历吧！</div>
    )
  }

  const totalWeeks = weekColumns.length

  return (
    <div className="heatmap-wrapper">
      {/* 月份标签 - 顶部 */}
      <div className="heatmap-months" style={{ '--weeks': totalWeeks } as React.CSSProperties}>
        <div className="heatmap-spacer" />
        <div className="heatmap-months-row">
          {Array.from({ length: totalWeeks }).map((_, idx) => {
            const label = monthLabels.find((m) => m.colIndex === idx)
            return (
              <div key={idx} className="heatmap-month-label">
                {label ? label.label : ''}
              </div>
            )
          })}
        </div>
      </div>

      <div className="heatmap-body">
        {/* 周几标签 - 左侧 */}
        <div className="heatmap-week-labels">
          {WEEK_LABELS.map((w) => (
            <div key={w} className="heatmap-week-label">{w}</div>
          ))}
        </div>

        {/* 方块网格 */}
        <div className="heatmap-grid" style={{ '--weeks': totalWeeks } as React.CSSProperties}>
          {weekColumns.map((col) => (
            <div key={col.weekIndex} className="heatmap-col">
              {col.days.map((d) => {
                if (!d.cell) {
                  return <div key={d.dayIndex} className="heatmap-cell heatmap-empty-cell" />
                }
                const level = d.cell.level
                const isToday = isTodayStr(d.cell.date)
                return (
                  <div
                    key={d.dayIndex}
                    className={`heatmap-cell heatmap-level-${level}${isToday ? ' heatmap-today' : ''}`}
                    onMouseEnter={(e) => {
                      setHoverCell(d.cell!)
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setHoverPos({ x: rect.left + rect.width / 2, y: rect.top })
                    }}
                    onMouseLeave={() => {
                      setHoverCell(null)
                      setHoverPos(null)
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="heatmap-legend">
        <span className="legend-text">少</span>
        <div className="heatmap-cell heatmap-level-0" />
        <div className="heatmap-cell heatmap-level-1" />
        <div className="heatmap-cell heatmap-level-2" />
        <div className="heatmap-cell heatmap-level-3" />
        <div className="heatmap-cell heatmap-level-4" />
        <span className="legend-text">多</span>
      </div>

      {/* Tooltip */}
      {hoverCell && hoverPos && (
        <div
          className="heatmap-tooltip"
          style={{
            left: hoverPos.x,
            top: hoverPos.y,
          }}
        >
          <div className="tooltip-date">{hoverCell.date}</div>
          <div className="tooltip-count">
            {hoverCell.count > 0 ? `答题 ${hoverCell.count} 题` : '无学习记录'}
          </div>
        </div>
      )}

      <style>{`
        .heatmap-wrapper {
          width: 100%;
          overflow-x: auto;
          padding: 4px 0;
        }
        .heatmap-empty {
          padding: 32px;
          text-align: center;
          color: var(--text-secondary);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .heatmap-months {
          display: flex;
          margin-bottom: 4px;
          min-width: calc(var(--weeks) * 15px + 30px);
        }
        .heatmap-spacer {
          width: 28px;
          flex-shrink: 0;
        }
        .heatmap-months-row {
          display: grid;
          grid-template-columns: repeat(var(--weeks), 15px);
          gap: 3px;
        }
        .heatmap-month-label {
          font-size: 11px;
          color: var(--text-muted);
          min-width: 12px;
        }
        .heatmap-body {
          display: flex;
          gap: 4px;
          min-width: calc(var(--weeks) * 15px + 30px);
        }
        .heatmap-week-labels {
          display: grid;
          grid-template-rows: repeat(7, 12px);
          gap: 3px;
          flex-shrink: 0;
          width: 24px;
        }
        .heatmap-week-label {
          font-size: 10px;
          color: var(--text-muted);
          line-height: 12px;
          height: 12px;
          text-align: right;
          padding-right: 4px;
        }
        .heatmap-grid {
          display: grid;
          grid-template-columns: repeat(var(--weeks), 12px);
          gap: 3px;
        }
        .heatmap-col {
          display: grid;
          grid-template-rows: repeat(7, 12px);
          gap: 3px;
        }
        .heatmap-cell {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          transition: transform 0.15s, box-shadow 0.15s;
          cursor: pointer;
        }
        .heatmap-cell:hover {
          transform: scale(1.4);
          box-shadow: 0 0 0 1px var(--text-muted);
          z-index: 10;
        }
        .heatmap-empty-cell {
          background: transparent;
          cursor: default;
        }
        .heatmap-empty-cell:hover {
          transform: none;
          box-shadow: none;
        }
        .heatmap-today {
          outline: 1.5px solid var(--primary);
          outline-offset: 0.5px;
        }
        /* GitHub 风格绿色渐变（颜色固定不变） */
        .heatmap-level-0 { background: var(--bg-muted); }
        .heatmap-level-1 { background: #0e4429; }
        .heatmap-level-2 { background: #006d32; }
        .heatmap-level-3 { background: #26a641; }
        .heatmap-level-4 { background: #39d353; }

        .heatmap-legend {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          justify-content: flex-end;
        }
        .heatmap-legend .heatmap-cell {
          width: 10px;
          height: 10px;
          cursor: default;
        }
        .heatmap-legend .heatmap-cell:hover {
          transform: none;
          box-shadow: none;
        }
        .legend-text {
          font-size: 11px;
          color: var(--text-muted);
        }

        .heatmap-tooltip {
          position: fixed;
          transform: translate(-50%, -100%);
          margin-top: -8px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          box-shadow: var(--shadow-float);
          z-index: 1000;
          pointer-events: none;
          white-space: nowrap;
        }
        .tooltip-date {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 2px;
        }
        .tooltip-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        @media (max-width: 768px) {
          .heatmap-week-label, .heatmap-month-label {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  )
}

// 判断是否为今天
function isTodayStr(dateStr: string): boolean {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return dateStr === todayStr
}
