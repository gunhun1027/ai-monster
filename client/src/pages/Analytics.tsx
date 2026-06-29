// 学习分析报告页面
import { useState, useEffect } from 'react'
import { analyticsApi } from '../services/api'
import type { AnalyticsOverview } from '../types'

export default function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await analyticsApi.overview()
        setData(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取分析数据失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>加载中...</div>
  if (error) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--danger)' }}>{error}</div>
  if (!data) return null

  const { totalQuiz, totalCorrect, accuracyRate, weeklyTrend, subjectStats, weakPoints, streakData } = data

  // 趋势图 SVG 坐标计算
  const chartW = 600, chartH = 200, padL = 40, padR = 20, padT = 20, padB = 30
  const innerW = chartW - padL - padR, innerH = chartH - padT - padB
  const points = weeklyTrend.map((d, i) => ({
    x: padL + (innerW / (weeklyTrend.length - 1 || 1)) * i,
    y: padT + innerH - (innerH * d.accuracy / 100),
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = linePath + ` L ${points[points.length - 1]?.x || 0} ${padT + innerH} L ${points[0]?.x || 0} ${padT + innerH} Z`

  return (
    <div className="analytics-page">
      {/* 概览卡片 */}
      <div className="analytics-stats-grid">
        <div className="card analytics-stat-card">
          <div className="analytics-stat-value">{totalQuiz}</div>
          <div className="analytics-stat-label">总答题数</div>
          <div className="analytics-stat-sub">正确率 {accuracyRate}%</div>
        </div>
        <div className="card analytics-stat-card">
          <div className="analytics-stat-value" style={{ color: 'var(--warning)' }}>{streakData.currentStreak}</div>
          <div className="analytics-stat-label">当前连胜天数</div>
        </div>
        <div className="card analytics-stat-card">
          <div className="analytics-stat-value" style={{ color: 'var(--success)' }}>{streakData.weeklyStreakDays}</div>
          <div className="analytics-stat-label">本周学习天数</div>
        </div>
      </div>

      {/* 正确率趋势图 */}
      <div className="card analytics-chart-card">
        <h3 className="analytics-section-title">正确率趋势（最近7天）</h3>
        {weeklyTrend.length > 0 ? (
          <div className="chart-container">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="trend-chart">
              {/* Y轴刻度 */}
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line x1={padL} y1={padT + innerH - (innerH * v / 100)} x2={chartW - padR} y2={padT + innerH - (innerH * v / 100)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={padL - 6} y={padT + innerH - (innerH * v / 100) + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">{v}%</text>
                </g>
              ))}
              {/* 面积填充 */}
              <path d={areaPath} fill="var(--primary-light)" opacity="0.3" />
              {/* 折线 */}
              <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* 数据点 */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill="var(--primary)" />
                  <text x={p.x} y={chartH - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="11">{p.date}</text>
                  <text x={p.x} y={p.y - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">{p.accuracy}%</text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>暂无数据</p>
        )}
      </div>

      {/* 各学科正确率 */}
      {subjectStats.length > 0 && (
        <div className="card analytics-chart-card">
          <h3 className="analytics-section-title">各学科正确率</h3>
          <div className="subject-bars">
            {subjectStats.map((s) => (
              <div key={s.subjectId} className="subject-bar-row">
                <span className="subject-bar-label">{s.subjectName}</span>
                <div className="subject-bar-track">
                  <div
                    className="subject-bar-fill"
                    style={{
                      width: `${s.accuracy}%`,
                      background: s.accuracy >= 80 ? 'var(--success)' : s.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)',
                    }}
                  />
                </div>
                <span className="subject-bar-value">{s.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 薄弱知识点 */}
      {weakPoints.length > 0 && (
        <div className="card analytics-chart-card">
          <h3 className="analytics-section-title">薄弱知识点</h3>
          <div className="weak-points-list">
            {weakPoints.map((w) => (
              <div key={w.tag} className="weak-point-item">
                <div className="weak-point-header">
                  <span className="weak-point-tag">{w.tag}</span>
                  <span className="weak-point-meta">错 {w.wrongCount} 次 / 共 {w.totalCount} 题</span>
                </div>
                <div className="weak-point-track">
                  <div
                    className="weak-point-fill"
                    style={{
                      width: `${w.masteryRate}%`,
                      background: w.masteryRate >= 80 ? 'var(--success)' : w.masteryRate >= 60 ? 'var(--warning)' : 'var(--danger)',
                    }}
                  />
                </div>
                <span className="weak-point-rate" style={{ color: w.masteryRate >= 80 ? 'var(--success)' : w.masteryRate >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                  掌握率 {w.masteryRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .analytics-page { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
        .analytics-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .analytics-stat-card { padding: 20px; text-align: center; }
        .analytics-stat-value { font-size: 32px; font-weight: 700; color: var(--primary); }
        .analytics-stat-label { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
        .analytics-stat-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
        .analytics-chart-card { padding: 20px; }
        .analytics-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }
        .chart-container { overflow-x: auto; }
        .trend-chart { width: 100%; min-width: 400px; height: auto; }
        .subject-bars { display: flex; flex-direction: column; gap: 12px; }
        .subject-bar-row { display: flex; align-items: center; gap: 12px; }
        .subject-bar-label { min-width: 80px; font-size: 14px; font-weight: 500; color: var(--text-primary); text-align: right; }
        .subject-bar-track { flex: 1; height: 10px; background: var(--bg-muted); border-radius: var(--radius-full); overflow: hidden; }
        .subject-bar-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.5s var(--ease-slide); }
        .subject-bar-value { min-width: 40px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .weak-points-list { display: flex; flex-direction: column; gap: 14px; }
        .weak-point-item { display: flex; flex-direction: column; gap: 6px; }
        .weak-point-header { display: flex; justify-content: space-between; align-items: center; }
        .weak-point-tag { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .weak-point-meta { font-size: 12px; color: var(--text-muted); }
        .weak-point-track { height: 8px; background: var(--bg-muted); border-radius: var(--radius-full); overflow: hidden; }
        .weak-point-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.5s var(--ease-slide); }
        .weak-point-rate { font-size: 12px; font-weight: 600; }
        @media (max-width: 600px) {
          .analytics-stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
