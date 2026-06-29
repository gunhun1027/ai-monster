// 剧情选择弹窗 - 玩家做出选择影响故事路线
import { useState } from 'react'
import { storyApi } from '../services/api'
import type { StoryChoiceSummary, StoryChoiceSelectResponse, TitleDef } from '../types'

interface StoryChoiceModalProps {
  choices: StoryChoiceSummary[]
  onComplete: (result: { unlockedTitle: TitleDef | null }) => void
  onSkip?: () => void
}

const ROUTE_COLORS: Record<string, string> = {
  brave: 'var(--danger)',
  cultivation: 'var(--info)',
  balanced: 'var(--success)',
}

const TRIGGER_LABELS: Record<string, string> = {
  streak_correct: '连击觉醒',
  streak_wrong: '逆境思考',
  boss_win: 'Boss胜利',
  boss_lose: 'Boss失败',
  first_enter: '初次探索',
}

export default function StoryChoiceModal({ choices, onComplete, onSkip }: StoryChoiceModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resultDialog, setResultDialog] = useState<string | null>(null)
  const [unlockedTitle, setUnlockedTitle] = useState<TitleDef | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentChoice = choices[currentIndex]
  const isLast = currentIndex >= choices.length - 1

  if (!currentChoice) {
    return null
  }

  // 处于"已选择，显示结果对话"阶段
  const showResult = resultDialog !== null

  const handleSelect = async (optionId: string) => {
    if (submitting) return
    setSelectedOption(optionId)
    setSubmitting(true)
    setError(null)
    try {
      const res: StoryChoiceSelectResponse = await storyApi.selectChoice(currentChoice.id, optionId)
      setResultDialog(res.nextDialog || '你做出了选择。')
      if (res.unlockedTitle) setUnlockedTitle(res.unlockedTitle)
    } catch (err) {
      setError(err instanceof Error ? err.message : '选择失败，请重试')
      setSelectedOption(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (isLast) {
      onComplete({ unlockedTitle })
    } else {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption(null)
      setResultDialog(null)
      setUnlockedTitle(null)
    }
  }

  const handleSkipAll = () => {
    if (onSkip) onSkip()
    else onComplete({ unlockedTitle: null })
  }

  return (
    <div className="story-choice-overlay">
      <div className="story-choice-modal">
        {/* 头部 */}
        <div className="story-choice-header">
          <span className="story-choice-badge">{TRIGGER_LABELS[currentChoice.triggerType] || '剧情'}</span>
          <span className="story-choice-counter">{currentIndex + 1} / {choices.length}</span>
          <button className="story-choice-skip" onClick={handleSkipAll} title="跳过全部">跳过</button>
        </div>

        {/* 标题与描述 */}
        <div className="story-choice-title">{currentChoice.title}</div>
        <div className="story-choice-desc">{currentChoice.description}</div>

        {/* 选项 或 结果 */}
        {!showResult ? (
          <div className="story-choice-options">
            {currentChoice.options.map((opt) => {
              const color = ROUTE_COLORS[opt.routeEffect] || 'var(--primary)'
              const isActive = selectedOption === opt.id
              return (
                <button
                  key={opt.id}
                  className={`story-choice-option${isActive ? ' active' : ''}`}
                  disabled={submitting}
                  onClick={() => handleSelect(opt.id)}
                  style={{ '--route-color': color } as React.CSSProperties}
                >
                  <span className="story-option-letter">{opt.routeEffect === 'brave' ? '勇' : opt.routeEffect === 'cultivation' ? '修' : '衡'}</span>
                  <span className="story-option-text">{opt.text}</span>
                  <span className="story-option-route" style={{ color }}>{opt.routeEffect === 'brave' ? '勇者' : opt.routeEffect === 'cultivation' ? '修行' : '平衡'}</span>
                </button>
              )
            })}
            {error && <div className="story-choice-error">{error}</div>}
            {submitting && <div className="story-choice-loading">提交中...</div>}
          </div>
        ) : (
          <div className="story-choice-result">
            <div className="story-choice-result-text">{resultDialog}</div>
            {unlockedTitle && (
              <div className="story-choice-title-unlock" style={{ color: unlockedTitle.color }}>
                <span className="title-icon">{unlockedTitle.icon}</span>
                <span>解锁称号：{unlockedTitle.name}</span>
              </div>
            )}
            <button className="btn btn-primary story-choice-next" onClick={handleNext}>
              {isLast ? '完成' : '继续'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .story-choice-overlay {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--text-primary) 65%, transparent);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          animation: scFadeIn 0.25s ease;
        }
        @keyframes scFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .story-choice-modal {
          width: 90%;
          max-width: 560px;
          background: var(--bg-card);
          border-radius: var(--radius-lg, 20px);
          box-shadow: var(--shadow-float);
          padding: 24px 24px 20px;
          animation: scSlideUp 0.3s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
          max-height: 90vh;
          overflow-y: auto;
        }
        @keyframes scSlideUp {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .story-choice-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .story-choice-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 999px;
          background: var(--bg-muted);
          color: var(--primary);
        }
        .story-choice-counter {
          font-size: 12px;
          color: var(--text-secondary);
          margin-left: auto;
        }
        .story-choice-skip {
          border: none;
          background: transparent;
          color: var(--text-tertiary, var(--text-secondary));
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
        }
        .story-choice-skip:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
        }
        .story-choice-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .story-choice-desc {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 20px;
          white-space: pre-wrap;
        }
        .story-choice-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .story-choice-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 16px;
          border: 2px solid var(--border, color-mix(in srgb, var(--text-primary) 8%, transparent));
          background: var(--bg-card);
          border-radius: 14px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          font-size: 14px;
          color: var(--text-primary);
        }
        .story-choice-option:hover:not(:disabled) {
          border-color: var(--route-color, var(--primary));
          background: color-mix(in srgb, var(--route-color, var(--primary)) 8%, var(--bg-card));
          transform: translateX(2px);
        }
        .story-choice-option.active {
          border-color: var(--route-color, var(--primary));
          background: color-mix(in srgb, var(--route-color, var(--primary)) 12%, var(--bg-card));
        }
        .story-choice-option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .story-option-letter {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--route-color, var(--primary));
          color: var(--text-on-primary);
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .story-option-text {
          flex: 1;
          font-size: 14px;
          line-height: 1.5;
        }
        .story-option-route {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--bg-muted);
        }
        .story-choice-error {
          color: var(--danger);
          font-size: 13px;
          padding: 8px 0;
        }
        .story-choice-loading {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .story-choice-result {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .story-choice-result-text {
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-primary);
          padding: 16px;
          background: var(--bg-muted);
          border-radius: 14px;
          border-left: 3px solid var(--primary);
        }
        .story-choice-title-unlock {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 16px;
          background: var(--bg-muted);
          border-radius: 12px;
          animation: scUnlock 0.5s ease;
        }
        @keyframes scUnlock {
          0% { transform: scale(0.95); opacity: 0; }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); opacity: 1; }
        }
        .title-icon { font-size: 20px; }
        .story-choice-next {
          align-self: flex-end;
          padding: 10px 28px;
        }
      `}</style>
    </div>
  )
}
