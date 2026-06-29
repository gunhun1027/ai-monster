// 挑战游戏组件 - 速答/Boss/生存模式
import { useState, useEffect, useCallback, useRef } from 'react'
import { challengeApi } from '../services/api'
import type { ChallengeConfig, Question } from '../types'

interface ChallengeAnswer {
  questionId: string
  isCorrect: boolean
  timeTaken: number
  selectedOption: number
  correctAnswer: number
  subjectId: string
  content: string
  options: string
}

interface ChallengeGameProps {
  config: ChallengeConfig
  subjectId?: string
  onEnd: () => void
}

export default function ChallengeGame({ config, subjectId, onEnd }: ChallengeGameProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [challengeId, setChallengeId] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [bossHp, setBossHp] = useState(10)
  const [survivalStreak, setSurvivalStreak] = useState(0)
  const [globalTimer, setGlobalTimer] = useState(config.timeLimit)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [correctAnswer, setCorrectAnswer] = useState<number>(-1)
  const [rewardCoins, setRewardCoins] = useState(0)
  const [rewardExp, setRewardExp] = useState(0)
  const answersRef = useRef<ChallengeAnswer[]>([])
  const scoreRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // 卸载时清理所有未完成的 setTimeout
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout)
  }, [])

  // 开始挑战
  useEffect(() => {
    const startChallenge = async () => {
      try {
        const result = await challengeApi.start(config.type, subjectId)
        setQuestions(result.data.questions)
        setChallengeId(result.data.challengeId)
        setGlobalTimer(result.data.timeLimit)
      } catch (err) {
      } finally {
        setLoading(false)
      }
    }
    startChallenge()
  }, [config.type, subjectId])

  // 全局计时器（仅速答模式）
  useEffect(() => {
    if (finished || loading || showResult || config.type !== 'speed') return

    timerRef.current = setInterval(() => {
      setGlobalTimer(prev => {
        if (prev <= 1) { finishChallenge(); return 0 }
        return prev - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [finished, loading, showResult, config.type, currentIndex])

  // 重置每题状态
  useEffect(() => {
    setSelectedOption(null)
    setShowResult(false)
    setCorrectAnswer(-1)
  }, [currentIndex])

  // 本地判断答案对错
  const checkAnswerLocal = useCallback((question: Question, optionIndex: number): boolean => {
    if (question.type === 'fillblank' || !question.answer) return false
    return optionIndex === parseInt(question.answer)
  }, [])

  const finishChallenge = useCallback(async () => {
    if (finished) return
    setFinished(true)
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      const result = await challengeApi.submit(challengeId, answersRef.current, scoreRef.current, config.type)
      setRewardCoins(result.data.rewardCoins)
      setRewardExp(result.data.rewardExp)
    } catch {
      // 即使提交失败也显示结果
    }
  }, [finished, challengeId, config.type])

  const handleSelectOption = (optionIndex: number) => {
    if (showResult) return
    setSelectedOption(optionIndex)

    const currentQuestion = questions[currentIndex]
    if (!currentQuestion) return

    const correct = checkAnswerLocal(currentQuestion, optionIndex)
    setIsCorrect(correct)
    setCorrectAnswer(currentQuestion.answer ? parseInt(currentQuestion.answer) : -1)
    setShowResult(true)

    const timeTaken = 0 // 挑战模式不计时每题

    // 记录答题
    const newAnswer: ChallengeAnswer = {
      questionId: currentQuestion.id,
      isCorrect: correct,
      timeTaken,
      selectedOption: optionIndex,
      correctAnswer: currentQuestion.answer ? parseInt(currentQuestion.answer) : -1,
      subjectId: currentQuestion.subjectId,
      content: currentQuestion.content,
      options: JSON.stringify(currentQuestion.options),
    }
    answersRef.current = [...answersRef.current, newAnswer]

    if (correct) {
      scoreRef.current += 1
      setScore(prev => prev + 1)

      if (config.type === 'boss') {
        setBossHp(prev => {
          const newHp = prev - 1
          if (newHp <= 0) { timersRef.current.push(setTimeout(() => finishChallenge(), 500)) }
          return newHp
        })
      } else if (config.type === 'survival') {
        setSurvivalStreak(prev => prev + 1)
      }

      // 正确：自动下一题
      timersRef.current.push(setTimeout(() => {
        nextQuestion()
      }, 800))
    } else {
      // 错误：生存模式直接结束
      if (config.type === 'survival') {
        timersRef.current.push(setTimeout(() => finishChallenge(), 1500))
      } else if (config.type === 'boss') {
        setBossHp(prev => Math.min(10, prev + 2))
      }
      // 速答模式错误：显示正确答案，需要手动点下一题
    }
  }

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      finishChallenge()
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }

  if (loading) return <div className="page-loader"><div className="loading-spinner"></div></div>

  // 结果页面
  if (finished) {
    return (
      <div className="challenge-result">
        <div className="card challenge-result-card">
          <h2>挑战结束</h2>
          <div className="result-score-big">{score}</div>
          <p className="result-label">
            {config.type === 'speed' ? '答对题数' : config.type === 'boss' ? '击败Boss进度' : '连续答对'}
          </p>
          <div className="result-rewards">
            <span>💰 +{rewardCoins}</span>
            <span>✨ +{rewardExp} EXP</span>
          </div>
          <button className="btn btn-primary" onClick={onEnd}>返回挑战列表</button>
        </div>
        <style>{`
          .challenge-result { max-width: 400px; margin: 0 auto; }
          .challenge-result-card { text-align: center; padding: 32px; }
          .result-score-big { font-size: 56px; font-weight: 700; color: var(--primary); margin: 16px 0 4px; }
          .result-label { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; }
          .result-rewards { display: flex; justify-content: center; gap: 16px; font-size: 16px; font-weight: 600; color: var(--warning); margin-bottom: 20px; }
        `}</style>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  return (
    <div className="challenge-game">
      {/* 顶部状态 */}
      <div className="challenge-top">
        <button className="btn btn-secondary btn-sm" onClick={onEnd}>退出</button>
        <div className="challenge-info">
          {config.type === 'speed' && (
            <span className="timer-global" style={{ color: globalTimer <= 10 ? 'var(--danger)' : 'var(--text-primary)' }}>
              ⏱ {globalTimer}s
            </span>
          )}
          {config.type === 'boss' && (
            <div className="boss-hp">
              <span>👹 Boss HP: {bossHp}/10</span>
              <div className="progress-bar" style={{ width: 120 }}>
                <div className="progress-fill" style={{ width: `${bossHp * 10}%`, background: 'var(--primary)' }} />
              </div>
            </div>
          )}
          {config.type === 'survival' && (
            <span>🏃 连续答对: {survivalStreak}</span>
          )}
        </div>
        <span className="challenge-score">得分: {score}</span>
      </div>

      {/* 题目 */}
      {currentQuestion && (
        <div className="challenge-question">
          <h3 className="question-content">{currentQuestion.content}</h3>

          <div className="question-options">
            {currentQuestion.options.map((opt, idx) => {
              let cls = 'option-btn'
              if (showResult) {
                cls += ' disabled'
                if (idx === correctAnswer) cls += ' correct'
                else if (idx === selectedOption && !isCorrect) cls += ' wrong'
              }
              return (
                <button
                  key={idx}
                  className={cls}
                  onClick={() => handleSelectOption(idx)}
                  disabled={showResult}
                >
                  <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                  <span className="option-text">{opt}</span>
                </button>
              )
            })}
          </div>

          {/* 错误时显示正确答案 + 下一题按钮 */}
          {showResult && !isCorrect && (
            <div className="challenge-wrong-feedback">
              <p className="wrong-answer-text">
                正确答案：<strong>{String.fromCharCode(65 + correctAnswer)}. {currentQuestion.options[correctAnswer]}</strong>
              </p>
              <button className="btn btn-primary" onClick={nextQuestion} style={{ width: '100%' }}>
                {currentIndex + 1 >= questions.length ? '完成挑战' : '下一题'}
              </button>
            </div>
          )}

          {/* 正确时短暂提示 */}
          {showResult && isCorrect && (
            <div className="challenge-correct-feedback">
              ✓ 回答正确！
            </div>
          )}
        </div>
      )}

      <style>{`
        .challenge-game { max-width: 600px; margin: 0 auto; }
        .challenge-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .challenge-info { font-size: 15px; font-weight: 600; color: var(--text-primary); }
        .timer-global { font-size: 20px; font-weight: 700; }
        .boss-hp { display: flex; align-items: center; gap: 8px; }
        .challenge-score { font-size: 15px; font-weight: 600; color: var(--warning); }
        .challenge-question {
          background: var(--bg-card); border-radius: var(--radius);
          border: 1px solid var(--border); padding: 20px;
        }
        .question-content {
          font-size: 17px; font-weight: 600; color: var(--text-primary);
          margin-bottom: 16px; line-height: 1.5;
        }
        .question-options { display: flex; flex-direction: column; gap: 8px; }
        .option-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: var(--radius);
          border: 2px solid var(--border); background: var(--bg-card);
          cursor: pointer; transition: all 0.15s; text-align: left;
          font-size: 14px; color: var(--text-primary);
        }
        .option-btn:hover:not(.disabled) { border-color: var(--primary); }
        .option-btn.correct { border-color: var(--success); background: var(--success-light); }
        .option-btn.wrong { border-color: var(--danger); background: var(--danger-light); }
        .option-btn.disabled { cursor: default; }
        .option-letter {
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--bg-muted); display: flex; align-items: center;
          justify-content: center; font-size: 13px; font-weight: 600;
          flex-shrink: 0;
        }
        .option-btn.correct .option-letter { background: var(--success); color: var(--text-on-primary); }
        .option-btn.wrong .option-letter { background: var(--danger); color: var(--text-on-primary); }
        .option-text { flex: 1; }
        .btn-sm { padding: 4px 12px; font-size: 13px; }
        .challenge-wrong-feedback {
          margin-top: 16px; padding: 14px 16px;
          background: var(--danger-light); border: 1px solid var(--danger);
          border-radius: var(--radius);
        }
        .wrong-answer-text {
          font-size: 14px; color: var(--text-primary); margin-bottom: 12px;
        }
        .wrong-answer-text strong { color: var(--success); }
        .challenge-correct-feedback {
          margin-top: 12px; text-align: center;
          font-size: 15px; font-weight: 600; color: var(--success);
          animation: fade-up 0.4s var(--ease-slide);
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
