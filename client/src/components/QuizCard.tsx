// 答题卡片组件 - 含怪兽表情反馈和宝箱掉落，支持选择题和填空题
import { useState, useEffect, useRef, useCallback } from 'react'
import CardDropAnimation from './CardDropAnimation'
import StoryChoiceModal from './StoryChoiceModal'
import type { Question, ChestDrop, DroppedCardInfo, StoryChoiceSummary, TitleDef } from '../types'

interface QuizCardProps {
  question: Question
  onSubmit: (selectedOption: number, timeTaken: number, fillblankAnswer?: string) => void
  questionIndex: number
  totalQuestions: number
  disabled?: boolean
  isCorrect?: boolean | null
  correctAnswerIndex?: number // 选择题正确答案的索引
  correctAnswerText?: string
  explanation?: string | null
  chestDrop?: ChestDrop | null
  onChestOpen?: (coins: number) => void
  // 剧情系统 v2 附加字段
  droppedCards?: DroppedCardInfo[] | null
  pendingStoryChoices?: StoryChoiceSummary[] | null
  onStoryChoiceComplete?: (result: { unlockedTitle: TitleDef | null }) => void
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

// 情绪状态
type MonsterReaction = 'idle' | 'thinking' | 'correct' | 'wrong'

const MOOD_EMOJI: Record<string, string> = {
  idle: '',
  thinking: '🤔',
  correct: '😊',
  wrong: '😢',
}

const MOOD_BUBBLE: Record<string, string> = {
  thinking: '加油！',
  correct: '太棒了！',
  wrong: '没关系，再试试~',
}

export default function QuizCard({
  question, onSubmit, questionIndex, totalQuestions, disabled = false,
  isCorrect, correctAnswerIndex, correctAnswerText, explanation, chestDrop, onChestOpen,
  droppedCards, pendingStoryChoices, onStoryChoiceComplete,
}: QuizCardProps) {
  const TIME_LIMIT = 30
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [reaction, setReaction] = useState<MonsterReaction>('idle')
  const [showBubble, setShowBubble] = useState(false)
  const [chestOpened, setChestOpened] = useState(false)
  const [showChestCoins, setShowChestCoins] = useState(false)
  const [fillblankAnswer, setFillblankAnswer] = useState('')
  // 剧情系统 v2：卡片掉落 + 剧情选择 弹窗状态
  const [showCardDrop, setShowCardDrop] = useState(false)
  const [showStoryChoice, setShowStoryChoice] = useState(false)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittedRef = useRef(false)
  const unmountedRef = useRef(false)

  const isFillblank = question.type === 'fillblank'

  // 提交答案（使用 ref 读取最新值，避免闭包问题）
  const selectedOptionRef = useRef<number | null>(null)
  selectedOptionRef.current = selectedOption
  const fillblankAnswerRef = useRef('')
  fillblankAnswerRef.current = fillblankAnswer
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  const doSubmit = useCallback(async (forcedOption?: number) => {
    if (submittedRef.current || disabledRef.current || unmountedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
    try {
      if (isFillblank) {
        const answer = fillblankAnswerRef.current.trim()
        await onSubmitRef.current(-2, timeTaken, answer)
        return
      }
      const finalOption = forcedOption !== undefined ? forcedOption : (selectedOptionRef.current ?? -1)
      await onSubmitRef.current(finalOption, timeTaken)
    } catch (err) {
      // 提交失败：重置状态，允许用户重试
      if (unmountedRef.current) return
      submittedRef.current = false
      setSubmitting(false)
      setSubmitError(err instanceof Error ? err.message : '提交失败，请重试')
    }
  }, [isFillblank])

  // 启动倒计时（30秒限时答题）
  useEffect(() => {
    submittedRef.current = false
    unmountedRef.current = false
    startTimeRef.current = Date.now()
    setSelectedOption(null)
    setSubmitting(false)
    setSubmitError(null)
    setReaction('idle')
    setShowBubble(false)
    setChestOpened(false)
    setShowChestCoins(false)
    setFillblankAnswer('')
    setTimeLeft(TIME_LIMIT)

    // 启动30秒倒计时
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          if (!unmountedRef.current) {
            timeoutRef.current = setTimeout(() => {
              if (unmountedRef.current) return
              doSubmit(-1)
            }, 0)
          }
          return 0
        }
        return next
      })
    }, 1000)

    return () => {
      unmountedRef.current = true
      if (timerRef.current) clearInterval(timerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [question.id]) // 只在题目变化时重置

  // 当外部传入isCorrect时更新反应
  useEffect(() => {
    if (isCorrect === true) {
      setReaction('correct')
      setShowBubble(true)
      const timer = setTimeout(() => setShowBubble(false), 2500)
      return () => clearTimeout(timer)
    } else if (isCorrect === false) {
      setReaction('wrong')
      setShowBubble(true)
      const timer = setTimeout(() => setShowBubble(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [isCorrect])

  // 剧情系统 v2：结果显示后，若存在掉落卡片，延迟展示掉落动画
  useEffect(() => {
    const resultShown = isCorrect !== undefined && isCorrect !== null
    if (resultShown && droppedCards && droppedCards.length > 0) {
      const timer = setTimeout(() => setShowCardDrop(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [isCorrect, droppedCards])

  // 卡片掉落动画结束后，若存在待处理剧情选择，展示选择弹窗
  const handleCardDropComplete = useCallback(() => {
    setShowCardDrop(false)
    if (pendingStoryChoices && pendingStoryChoices.length > 0) {
      setShowStoryChoice(true)
    }
  }, [pendingStoryChoices])

  const handleStoryChoiceComplete = useCallback((result: { unlockedTitle: TitleDef | null }) => {
    setShowStoryChoice(false)
    if (onStoryChoiceComplete) onStoryChoiceComplete(result)
  }, [onStoryChoiceComplete])

  const handleSubmit = () => {
    if (submitting || disabled) return
    if (isFillblank) {
      if (!fillblankAnswer.trim()) return
      void doSubmit()
    } else {
      if (selectedOption === null) return
      void doSubmit(selectedOption)
    }
  }

  // 重试提交：清除错误状态后重新提交
  const handleRetry = () => {
    setSubmitError(null)
    if (isFillblank) {
      void doSubmit()
    } else if (selectedOption !== null) {
      void doSubmit(selectedOption)
    }
  }

  const handleOptionClick = (index: number) => {
    if (isOptionsDisabled) return
    setSelectedOption(index)
    setReaction('thinking')
    setShowBubble(true)
    setTimeout(() => setShowBubble(false), 1000)
  }

  const handleChestOpen = () => {
    if (chestOpened || !chestDrop) return
    setChestOpened(true)
    setShowChestCoins(true)
    onChestOpen?.(chestDrop.coins)
    setTimeout(() => setShowChestCoins(false), 2500)
  }

  const isOptionsDisabled = submitting || disabled
  const isResultShown = isCorrect !== undefined && isCorrect !== null

  // 怪兽头像风格
  const monsterReactionClass = reaction === 'thinking' ? 'breathing' : reaction === 'correct' ? 'bounce' : reaction === 'wrong' ? 'shake' : ''

  const chestEmoji: Record<string, string> = {
    normal: '📦',
    rare: '🎁',
    legendary: '👑',
  }

  return (
    <div className="card quiz-card">
      {/* 顶部：进度 + 倒计时 */}
      <div className="quiz-header">
        <span className="quiz-progress">
          {questionIndex + 1} / {totalQuestions}
        </span>
        <span className={`quiz-timer ${timeLeft <= 10 ? 'timer-warning' : timeLeft <= 5 ? 'timer-danger' : ''}`}>
          ⏱ {timeLeft}s
        </span>
      </div>

      {/* 怪兽头像反应区 */}
      <div className="monster-reaction-area">
        <div className={`monster-reaction-avatar ${monsterReactionClass}`}>
          <span className="reaction-emoji">{MOOD_EMOJI[reaction] || '🐲'}</span>
        </div>
        {showBubble && (
          <div className="monster-bubble">{MOOD_BUBBLE[reaction]}</div>
        )}
      </div>

      {/* 题目内容 */}
      <div className="quiz-content">
        {isFillblank
          ? question.content.split(/_{2,}/).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <input
                    type="text"
                    className="fillblank-input"
                    value={fillblankAnswer}
                    onChange={(e) => setFillblankAnswer(e.target.value)}
                    placeholder="输入答案"
                    disabled={isOptionsDisabled}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && fillblankAnswer.trim()) handleSubmit()
                    }}
                  />
                )}
              </span>
            ))
          : question.content
        }
      </div>

      {/* 选项（仅选择题） */}
      {!isFillblank && (
        <div className="quiz-options">
          {question.options.map((option, index) => {
            let cls = 'quiz-option'
            if (isResultShown) {
              // 提交后：标记正确答案和错误选项
              if (index === correctAnswerIndex) {
                cls += ' correct-answer'
              } else if (index === selectedOption && !isCorrect) {
                cls += ' wrong-answer'
              } else {
                cls += ' dimmed'
              }
            } else {
              if (selectedOption === index) cls += ' selected'
              if (isOptionsDisabled && selectedOption !== index) cls += ' dimmed'
            }
            return (
              <button
                key={index}
                className={cls}
                onClick={() => handleOptionClick(index)}
                disabled={isOptionsDisabled || isResultShown}
              >
                <span className="option-letter">{OPTION_LETTERS[index]}</span>
                <span className="option-text">{option}</span>
                {isResultShown && index === correctAnswerIndex && (
                  <span className="correct-mark">✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* 填空题答案输入（题目行内已有输入框，此处为确认提交） */}
      {isFillblank && !isResultShown && (
        <div className="quiz-footer">
          {submitError && (
            <div className="submit-error-bar">
              <span className="submit-error-msg">{submitError}</span>
              <button className="btn-retry" onClick={handleRetry} disabled={submitting || !fillblankAnswer.trim()}>
                重试
              </button>
            </div>
          )}
          <button
            className="btn btn-primary quiz-submit"
            onClick={handleSubmit}
            disabled={!fillblankAnswer.trim() || submitting || disabled}
          >
            {submitting ? '提交中...' : '提交答案'}
          </button>
        </div>
      )}

      {/* 提交按钮（选择题） */}
      {!isFillblank && (
      <div className="quiz-footer">
        {submitError && (
          <div className="submit-error-bar">
            <span className="submit-error-msg">{submitError}</span>
            <button className="btn-retry" onClick={handleRetry} disabled={submitting || selectedOption === null}>
              重试
            </button>
          </div>
        )}
        <button
          className="btn btn-primary quiz-submit"
          onClick={handleSubmit}
          disabled={selectedOption === null || submitting || disabled}
        >
          {submitting ? '提交中...' : '提交答案'}
        </button>
      </div>
      )}

      {/* 填空题结果反馈 */}
      {isFillblank && isResultShown && (
        <div className="fillblank-result">
          {!isCorrect && correctAnswerText && (
            <p className="fillblank-correct-answer">
              正确答案：<strong>{correctAnswerText}</strong>
            </p>
          )}
          {explanation && (
            <p className="fillblank-explanation">{explanation}</p>
          )}
        </div>
      )}

      {/* 宝箱掉落 */}
      {isResultShown && chestDrop && (
        <div className="chest-drop-area">
          <div className={`chest-box ${chestOpened ? 'opened' : ''}`} onClick={handleChestOpen}>
            {chestOpened ? (
              <span className="chest-opened-icon">✨</span>
            ) : (
              <>
                <span className="chest-icon">{chestEmoji[chestDrop.type] || '📦'}</span>
                <span className="chest-label">{chestDrop.label}</span>
                <span className="chest-hint">点击打开</span>
              </>
            )}
          </div>
          {showChestCoins && (
            <div className="chest-coins-popup">
              +{chestDrop.coins} 💰
            </div>
          )}
        </div>
      )}

      {/* 剧情系统 v2：卡片掉落动画 */}
      {showCardDrop && droppedCards && droppedCards.length > 0 && (
        <CardDropAnimation cards={droppedCards} onComplete={handleCardDropComplete} />
      )}

      {/* 剧情系统 v2：剧情选择弹窗（卡片掉落后展示） */}
      {showStoryChoice && pendingStoryChoices && pendingStoryChoices.length > 0 && (
        <StoryChoiceModal
          choices={pendingStoryChoices}
          onComplete={handleStoryChoiceComplete}
          onSkip={() => handleStoryChoiceComplete({ unlockedTitle: null })}
        />
      )}

      <style>{`
        @keyframes timer-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes monster-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes monster-bounce-win {
          0% { transform: scale(1); }
          30% { transform: scale(1.25); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes monster-shake-lose {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes monster-sleep {
          0%, 100% { transform: rotate(0); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes bubble-pop {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes chest-glow {
          0%, 100% { box-shadow: 0 0 8px color-mix(in srgb, var(--warning) 30%, transparent); }
          50% { box-shadow: 0 0 20px color-mix(in srgb, var(--warning) 60%, transparent); }
        }
        @keyframes coins-fly {
          0% { opacity: 1; transform: translateY(0) scale(0.5); }
          100% { opacity: 0; transform: translateY(-30px) scale(1.2); }
        }

        .quiz-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 680px;
          margin: 0 auto;
        }
        .quiz-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .quiz-progress {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .quiz-timer {
          font-size: 14px;
          font-variant-numeric: tabular-nums;
          transition: color 0.3s ease;
          font-weight: 600;
        }
        .timer-warning {
          color: var(--warning);
          animation: timer-pulse 0.5s ease-in-out infinite;
        }
        .timer-danger {
          color: var(--danger);
          animation: timer-pulse 0.3s ease-in-out infinite;
        }

        /* 怪兽反应区 */
        .monster-reaction-area {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          min-height: 36px;
          position: relative;
        }
        .monster-reaction-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-muted);
          transition: transform 0.3s var(--ease-slide);
        }
        .monster-reaction-avatar.breathing {
          animation: monster-breathe 2s ease-in-out infinite;
        }
        .monster-reaction-avatar.bounce {
          animation: monster-bounce-win 0.6s var(--ease-spring);
        }
        .monster-reaction-avatar.shake {
          animation: monster-shake-lose 0.6s var(--ease-spring);
        }
        .monster-reaction-avatar.sleep {
          animation: monster-sleep 1.5s ease-in-out infinite;
        }
        .reaction-emoji {
          font-size: 22px;
        }
        .monster-bubble {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: 100%;
          margin-bottom: 6px;
          padding: 4px 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
          box-shadow: var(--shadow-sm);
          animation: bubble-pop 0.3s var(--ease-slide);
          z-index: 5;
        }

        .quiz-content {
          font-size: 18px;
          font-weight: 500;
          line-height: 1.7;
          color: var(--text-primary);
          padding: 4px 0;
        }
        /* 填空题输入框 */
        .fillblank-input {
          display: inline-block;
          width: 160px;
          padding: 4px 10px;
          border: 2px solid var(--primary);
          border-radius: var(--radius-sm);
          font-size: 16px;
          color: var(--text-primary);
          background: var(--bg-card);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          margin: 0 4px;
          vertical-align: baseline;
        }
        .fillblank-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }
        .fillblank-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .fillblank-input::placeholder {
          color: var(--text-muted);
          font-size: 14px;
        }
        /* 填空题结果 */
        .fillblank-result {
          margin-top: 8px;
          padding: 12px 16px;
          background: var(--bg-muted);
          border-radius: var(--radius);
        }
        .fillblank-correct-answer {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .fillblank-correct-answer strong {
          color: var(--success);
        }
        .fillblank-explanation {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .quiz-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .quiz-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: var(--bg-card);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          font-size: 14px;
          color: var(--text-primary);
          text-align: left;
          transition: all 0.2s var(--ease-slide);
          cursor: pointer;
        }
        .quiz-option:hover:not(.dimmed):not([disabled]) {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .quiz-option.selected {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }
        .quiz-option.dimmed {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .option-letter {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-muted);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 13px;
          flex-shrink: 0;
          transition: all 0.2s var(--ease-slide);
        }
        .quiz-option.selected .option-letter {
          background: color-mix(in srgb, var(--primary) 40%, transparent);
          color: white;
        }
        .quiz-option.correct-answer {
          background: var(--success-light);
          border-color: var(--success);
        }
        .quiz-option.correct-answer .option-letter {
          background: var(--success);
          color: white;
        }
        .quiz-option.wrong-answer {
          background: var(--danger-light);
          border-color: var(--danger);
        }
        .quiz-option.wrong-answer .option-letter {
          background: var(--danger);
          color: white;
        }
        .correct-mark {
          color: var(--success);
          font-weight: 700;
          font-size: 16px;
          margin-left: auto;
        }
        .option-text {
          flex: 1;
        }
        .quiz-footer {
          padding-top: 4px;
        }
        .quiz-submit {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius);
        }
        /* 提交错误提示条 */
        .submit-error-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          margin-bottom: 8px;
          background: var(--danger-light);
          border: 1px solid var(--danger);
          border-radius: var(--radius);
        }
        .submit-error-msg {
          font-size: 13px;
          color: var(--danger-text, var(--danger));
          flex: 1;
        }
        .btn-retry {
          padding: 6px 16px;
          background: var(--danger);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-retry:hover:not(:disabled) {
          opacity: 0.85;
        }
        .btn-retry:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-disabled {
          background: var(--bg-muted);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        /* 宝箱掉落 */
        .chest-drop-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
        }
        .chest-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 24px;
          background: var(--warning-light);
          border: 2px solid var(--warning);
          border-radius: var(--radius);
          cursor: pointer;
          animation: chest-glow 2s ease-in-out infinite;
          transition: all 0.3s var(--ease-slide);
        }
        .chest-box:hover {
          transform: scale(1.05);
        }
        .chest-box.opened {
          background: var(--success-light);
          border-color: var(--success);
          animation: none;
          cursor: default;
        }
        .chest-icon { font-size: 28px; }
        .chest-opened-icon { font-size: 28px; }
        .chest-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--warning-text);
        }
        .chest-box.opened .chest-label { color: var(--success-text); }
        .chest-hint {
          font-size: 11px;
          color: var(--text-muted);
        }
        .chest-coins-popup {
          position: absolute;
          top: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--warning);
          animation: coins-fly 2.5s var(--ease-slide) forwards;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}