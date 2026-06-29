// 进化弹窗组件 - 简约设计
import type { QuizResult } from '../types'

interface EvolutionModalProps {
  result: QuizResult
  onClose: () => void
}

const MONSTER_IMAGES: Record<string, string> = {
  egg: '/assets/monsters/monster-egg.svg',
  slime: '/assets/monsters/monster-slime.svg',
  dragon: '/assets/monsters/monster-dragon.svg',
  fire: '/assets/monsters/monster-fire.svg',
  divine: '/assets/monsters/monster-divine.svg',
}

export default function EvolutionModal({ result, onClose }: EvolutionModalProps) {
  if (!result.evolution) return null

  const { newStage, stageInfo } = result.evolution
  const monsterImg = MONSTER_IMAGES[newStage] || MONSTER_IMAGES.egg

  return (
    <div className="evolution-overlay" onClick={onClose}>
      <div className="evolution-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="evolution-title">进化成功</h2>

        <div className="evolution-image-wrap">
          <img src={monsterImg} alt={stageInfo.name} className="evolution-image" />
        </div>

        <h3 className="evolution-name">{stageInfo.name}</h3>
        <p className="evolution-desc">{stageInfo.description}</p>

        <button className="btn btn-primary evolution-btn" onClick={onClose}>
          确认
        </button>
      </div>

      <style>{`
        .evolution-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .evolution-card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          padding: 32px 28px;
          max-width: 360px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .evolution-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .evolution-image-wrap {
          display: flex;
          justify-content: center;
        }
        .evolution-image {
          width: 140px;
          height: auto;
        }
        .evolution-name {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .evolution-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .evolution-btn {
          margin-top: 4px;
          min-width: 120px;
        }
      `}</style>
    </div>
  )
}
