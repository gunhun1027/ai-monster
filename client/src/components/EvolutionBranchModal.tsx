// 进化分支选择弹窗 - 当怪兽首次进化时触发
import { useState } from 'react'
import { branchApi } from '../services/api'
import type { PathPoints, EvolutionBranch } from '../types'

interface EvolutionBranchModalProps {
  pathPoints: PathPoints
  onChoose: (branch: string) => void
  onClose: () => void
}

const BRANCHES: Record<string, EvolutionBranch & { color: string; description: string; cssFilter: string }> = {
  brave: {
    name: '勇武之路',
    color: 'var(--danger)',
    description: '答题速度快、连击高 → 进化成攻击型怪兽',
    cssFilter: 'hue-rotate(0deg) brightness(1.1)',
    stages: {
      egg: { name: '战斗蛋', emoji: '🥚', image: '/assets/monsters/monster-egg.svg', description: '一颗充满战意的蛋' },
      slime: { name: '烈焰史莱姆', emoji: '🔴', image: '/assets/monsters/monster-slime.svg' },
      dragon: { name: '雷霆幼龙', emoji: '⚡', image: '/assets/monsters/monster-dragon.svg' },
      fire: { name: '烈焰龙王', emoji: '🔥', image: '/assets/monsters/monster-fire.svg' },
      divine: { name: '战神兽', emoji: '⚔️', image: '/assets/monsters/monster-divine.svg' },
    },
  },
  wise: {
    name: '智慧之路',
    color: 'var(--info)',
    description: '正确率高、错题少 → 进化成智慧型怪兽',
    cssFilter: 'hue-rotate(200deg) brightness(1.2)',
    stages: {
      egg: { name: '智慧蛋', emoji: '🥚', image: '/assets/monsters/monster-egg.svg', description: '一颗散发微光的蛋' },
      slime: { name: '星光史莱姆', emoji: '🔵', image: '/assets/monsters/monster-slime.svg' },
      dragon: { name: '水晶幼龙', emoji: '💎', image: '/assets/monsters/monster-dragon.svg' },
      fire: { name: '星龙王', emoji: '✨', image: '/assets/monsters/monster-fire.svg' },
      divine: { name: '智神兽', emoji: '📖', image: '/assets/monsters/monster-divine.svg' },
    },
  },
  tough: {
    name: '坚韧之路',
    color: 'var(--warning)',
    description: '连续学习天数多、坚持久 → 进化成防御型怪兽',
    cssFilter: 'hue-rotate(40deg) brightness(0.9)',
    stages: {
      egg: { name: '坚韧蛋', emoji: '🥚', image: '/assets/monsters/monster-egg.svg', description: '一颗坚如磐石的蛋' },
      slime: { name: '岩石史莱姆', emoji: '🟤', image: '/assets/monsters/monster-slime.svg' },
      dragon: { name: '钢铁幼龙', emoji: '🛡️', image: '/assets/monsters/monster-dragon.svg' },
      fire: { name: '大地龙王', emoji: '🌋', image: '/assets/monsters/monster-fire.svg' },
      divine: { name: '守护神兽', emoji: '🏔️', image: '/assets/monsters/monster-divine.svg' },
    },
  },
}

export default function EvolutionBranchModal({ pathPoints, onChoose, onClose }: EvolutionBranchModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 推荐分支
  const maxPoint = Math.max(pathPoints.brave, pathPoints.wise, pathPoints.tough)
  const recommended = maxPoint === 0 ? 'brave'
    : pathPoints.brave >= pathPoints.wise && pathPoints.brave >= pathPoints.tough ? 'brave'
    : pathPoints.wise >= pathPoints.tough ? 'wise' : 'tough'

  const handleChoose = async (branch: string) => {
    setLoading(true)
    try {
      await branchApi.chooseBranch(branch)
      onChoose(branch)
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="branch-overlay" onClick={onClose}>
      <div className="branch-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="branch-title">选择进化之路</h2>
        <p className="branch-subtitle">你的怪兽即将进化，请选择一条进化路径</p>

        <div className="branch-options">
          {Object.entries(BRANCHES).map(([key, branch]) => {
            const point = pathPoints[key as keyof PathPoints] || 0
            const isRecommended = key === recommended

            return (
              <div
                key={key}
                className={`branch-option ${selected === key ? 'selected' : ''}`}
                style={{ borderColor: selected === key ? branch.color : undefined }}
                onClick={() => setSelected(key)}
              >
                {isRecommended && <div className="branch-recommend">推荐</div>}

                <div className="branch-preview">
                  <img
                    src={branch.stages.slime.image}
                    alt={branch.stages.slime.name}
                    className="branch-preview-img"
                    style={{ filter: branch.cssFilter }}
                  />
                </div>

                <h3 className="branch-name" style={{ color: branch.color }}>{branch.name}</h3>
                <p className="branch-desc">{branch.description}</p>

                <div className="branch-points">
                  倾向点数: {point}
                </div>

                <div className="branch-stages">
                  {Object.entries(branch.stages).map(([stage, info]) => (
                    <span key={stage} className="branch-stage-chip" title={info.name}>
                      {info.emoji}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <button
          className="btn btn-primary branch-confirm-btn"
          disabled={!selected || loading}
          onClick={() => selected && handleChoose(selected)}
        >
          {loading ? '确认中...' : selected ? `选择${BRANCHES[selected].name}` : '请选择一条路径'}
        </button>
      </div>

      <style>{`
        .branch-overlay {
          position: fixed; inset: 0;
          background: color-mix(in srgb, var(--text-primary) 60%, transparent);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .branch-card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          padding: 28px 24px;
          max-width: 800px; width: 100%;
          text-align: center;
        }
        .branch-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .branch-subtitle { font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; }
        .branch-options {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 600px) {
          .branch-options { grid-template-columns: 1fr; }
        }
        .branch-option {
          position: relative;
          padding: 16px 12px;
          border-radius: var(--radius);
          border: 2px solid var(--border);
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .branch-option:hover { border-color: var(--primary); }
        .branch-option.selected { border-width: 2px; }
        .branch-recommend {
          position: absolute; top: -8px; right: -4px;
          background: var(--warning);
          color: var(--text-on-primary);
          font-size: 11px; font-weight: 600;
          padding: 2px 8px; border-radius: var(--radius-full);
        }
        .branch-preview { margin-bottom: 8px; }
        .branch-preview-img { width: 80px; height: auto; }
        .branch-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
        .branch-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px; }
        .branch-points { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 6px; }
        .branch-stages { display: flex; justify-content: center; gap: 4px; }
        .branch-stage-chip {
          font-size: 16px;
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          background: var(--bg-muted);
        }
        .branch-confirm-btn { min-width: 200px; }
      `}</style>
    </div>
  )
}
