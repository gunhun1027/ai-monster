// 主页 - 怪兽展示 + 学科选择 + 答题流程
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGame } from '../hooks/useGame'
import { studyPlanApi, wrongAnswerApi } from '../services/api'
import MonsterCard from '../components/MonsterCard'
import QuizCard from '../components/QuizCard'
import EvolutionModal from '../components/EvolutionModal'
import StreakFire from '../components/StreakFire'
import DailyReward from '../components/DailyReward'
import AiQuestionModal from '../components/AiQuestionModal'
import type { Subject, QuizResult, ChestDrop, TodayProgress, Question } from '../types'

type Phase = 'select' | 'quiz' | 'result'

export default function Home() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const {
    subjects,
    questions,
    loading,
    error,
    fetchSubjects,
    fetchQuestions,
    submitAnswer,
    setError,
  } = useGame()

  const [phase, setPhase] = useState<Phase>('select')
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentResult, setCurrentResult] = useState<QuizResult | null>(null)
  const [stats, setStats] = useState({ correct: 0, totalExp: 0, maxCombo: 0, totalCoins: 0 })
  const [quizList, setQuizList] = useState(questions)
  const [quizIsCorrect, setQuizIsCorrect] = useState<boolean | null>(null)
  const [quizChestDrop, setQuizChestDrop] = useState<ChestDrop | null>(null)
  const [todayProgress, setTodayProgress] = useState<TodayProgress | null>(null)
  const [unmasteredCount, setUnmasteredCount] = useState(0)
  const [showAiModal, setShowAiModal] = useState(false)

  useEffect(() => { fetchSubjects() }, [fetchSubjects])
  useEffect(() => { setQuizList(questions) }, [questions])

  // 加载今日进度和错题数量
  useEffect(() => {
    const loadData = async () => {
      try {
        const [progress, wrongData] = await Promise.all([
          studyPlanApi.today().catch(() => null),
          wrongAnswerApi.list(1, 1, '', 'false').catch(() => null),
        ])
        if (progress) setTodayProgress(progress)
        if (wrongData) setUnmasteredCount(wrongData.unmasteredCount)
      } catch {}
    }
    loadData()
  }, [phase])

  const startQuiz = useCallback(async (subject: Subject) => {
    setError(null)
    setCurrentSubject(subject)
    setCurrentIndex(0)
    setCurrentResult(null)
    setQuizIsCorrect(null)
    setQuizChestDrop(null)
    setStats({ correct: 0, totalExp: 0, maxCombo: 0, totalCoins: 0 })
    setPhase('quiz')
    setQuizList([])
    const qs = await fetchQuestions(subject.id, 10)
    setQuizList(qs)
  }, [fetchQuestions, setError])

  const handleSubmitAnswer = async (selectedOption: number, timeTaken: number, fillblankAnswer?: string) => {
    const currentQuestion = quizList[currentIndex]
    if (!currentQuestion) return

    try {
      const result = await submitAnswer(currentQuestion.id, selectedOption, timeTaken, fillblankAnswer)
      setCurrentResult(result)
      setQuizIsCorrect(result.isCorrect)
      setQuizChestDrop(result.chestDrop)
      setStats((prev) => ({
        correct: prev.correct + (result.isCorrect ? 1 : 0),
        totalExp: prev.totalExp + result.expGained,
        maxCombo: Math.max(prev.maxCombo, result.combo),
        totalCoins: prev.totalCoins + (result.coinsGained || 0),
      }))
      if (result.monster) {
        updateUser({
          monsterExp: result.monster.exp,
          monsterMaxExp: result.monster.maxExp,
          monsterLevel: result.monster.level,
          monsterStage: result.monster.stage,
          monsterMood: result.monster.mood,
          hunger: result.monster.hunger,
          happiness: result.monster.happiness,
          cleanliness: result.monster.cleanliness,
          coins: result.monster.coins,
          streakDays: result.streakDays,
          combo: result.combo,
        })
      }
    } catch {
      // hook已处理
    }
  }

  const handleChestOpen = (coins: number) => {
    setStats((prev) => ({ ...prev, totalCoins: prev.totalCoins + coins }))
  }

  const handleNext = () => {
    setCurrentResult(null)
    setQuizIsCorrect(null)
    setQuizChestDrop(null)
    if (currentIndex + 1 >= quizList.length) {
      setPhase('result')
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleBackToSelect = () => {
    setPhase('select')
    setCurrentSubject(null)
    setCurrentIndex(0)
    setCurrentResult(null)
    setQuizIsCorrect(null)
    setQuizChestDrop(null)
    setStats({ correct: 0, totalExp: 0, maxCombo: 0, totalCoins: 0 })
  }

  // AI出题生成后直接进入答题
  const handleAiQuestionsGenerated = (questions: Question[], subjectName: string) => {
    setError(null)
    setCurrentSubject({ id: 'ai-generated', name: subjectName, description: null, icon: '🤖', questionCount: questions.length })
    setCurrentIndex(0)
    setCurrentResult(null)
    setQuizIsCorrect(null)
    setQuizChestDrop(null)
    setStats({ correct: 0, totalExp: 0, maxCombo: 0, totalCoins: 0 })
    setPhase('quiz')
    setQuizList(questions)
  }

  // ===== 学科选择 =====
  const renderSelect = () => (
    <div className="home-select">
      <div className="home-layout">
        <div className="home-monster-col">
          {user && (
            <MonsterCard
              user={user}
              onUpdate={(updates) => updateUser(updates)}
            />
          )}
        </div>

        <div className="home-subjects-col">
          <div className="home-section-header">
            <h2 className="home-section-title">选择学科</h2>
            {user && <StreakFire days={user.streakDays} />}
          </div>

          {/* 每日奖励 */}
          <DailyReward
            onCoinsUpdate={(coins) => updateUser({ coins })}
          />

          {/* 今日进度卡片 */}
          {todayProgress && (
            <div className="card today-progress-card">
              <div className="progress-ring-wrap">
                <svg className="progress-ring" width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg-muted)" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none" stroke="var(--primary)" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - todayProgress.progressPercent / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 0.6s var(--ease-slide)' }}
                  />
                </svg>
                <div className="progress-ring-text">
                  <span className="progress-ring-value">{todayProgress.quizCount}/{todayProgress.dailyGoal}</span>
                  <span className="progress-ring-label">今日目标</span>
                </div>
              </div>
              <div className="progress-info">
                {todayProgress.goalAchieved ? (
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>今日目标已达成</span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    已完成 {todayProgress.progressPercent}%，再答 {Math.max(0, todayProgress.dailyGoal - todayProgress.quizCount)} 题达成目标
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 错题复习入口 */}
          <button
            className="card wrong-answer-entry"
            onClick={() => navigate('/wrong-answers')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', marginBottom: 16, border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>错题复习</span>
            {unmasteredCount > 0 && (
              <span className="badge badge-danger" style={{ fontSize: 12, borderRadius: 'var(--radius-full)', padding: '2px 10px' }}>{unmasteredCount} 题待复习</span>
            )}
          </button>

          {/* 使用引导 */}
          <div className="card home-guide">
            <div className="guide-title">怎么玩？</div>
            <div className="guide-steps">
              <div className="guide-step">1. 选择下方学科，开始答题</div>
              <div className="guide-step">2. 选择答案后提交，答对喂养怪兽获得经验</div>
              <div className="guide-step">3. 连续答对触发Combo加成，经验翻倍！</div>
              <div className="guide-step">4. 经验满后怪兽进化，解锁新形态</div>
              <div className="guide-step">5. 每日答题保持连胜，领取成就徽章</div>
            </div>
          </div>

          {/* AI智能出题入口 */}
          <button
            className="card ai-question-entry"
            onClick={() => setShowAiModal(true)}
            disabled={loading}
          >
            <div className="ai-entry-icon">🤖</div>
            <div className="ai-entry-text">
              <div className="ai-entry-title">AI 智能出题</div>
              <div className="ai-entry-desc">输入知识点，AI自动生成个性化题目</div>
            </div>
            <div className="ai-entry-arrow">→</div>
          </button>

          {loading && <p className="home-loading">加载中...</p>}

          <div className="subject-grid">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                className="card subject-card"
                onClick={() => startQuiz(subject)}
                disabled={loading}
              >
                <div className="subject-name">{subject.name}</div>
                <div className="subject-meta">
                  <span className="badge badge-primary">{subject.questionCount} 题</span>
                </div>
              </button>
            ))}
            {!loading && subjects.length === 0 && (
              <p className="home-empty">暂无学科</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .home-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
          align-items: start;
        }
        .home-monster-col {
          position: sticky;
          top: 80px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .home-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .home-section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .home-loading, .home-empty {
          padding: 24px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }
        /* 今日进度 */
        .today-progress-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          margin-bottom: 12px;
        }
        .progress-ring-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .progress-ring-text {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .progress-ring-value {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .progress-ring-label {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .progress-info {
          flex: 1;
        }
        .home-guide {
          margin-top: 16px;
          margin-bottom: 20px;
          padding: 16px 20px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--warning) 10%, transparent), color-mix(in srgb, var(--success) 10%, transparent));
          border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
        }
        html.dark .home-guide {
          background: linear-gradient(135deg, color-mix(in srgb, var(--warning) 10%, transparent), color-mix(in srgb, var(--success) 10%, transparent));
          border: 1px solid color-mix(in srgb, var(--warning) 20%, transparent);
        }
        .guide-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--warning);
          margin-bottom: 10px;
        }
        .guide-steps {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .guide-step {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .subject-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }
        .subject-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.15s;
          padding: 20px 14px;
        }
        .subject-card:hover:not(:disabled) {
          border-color: var(--primary);
        }
        .subject-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .subject-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        /* AI出题入口 */
        .ai-question-entry {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          margin-bottom: 16px;
          cursor: pointer;
          text-align: left;
          background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), color-mix(in srgb, var(--accent, var(--primary)) 8%, transparent));
          border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
          transition: all 0.2s;
        }
        .ai-question-entry:hover:not(:disabled) {
          border-color: var(--primary);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 12%, transparent);
        }
        .ai-question-entry:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ai-entry-icon {
          font-size: 28px;
          flex-shrink: 0;
        }
        .ai-entry-text {
          flex: 1;
        }
        .ai-entry-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--primary);
        }
        .ai-entry-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .ai-entry-arrow {
          font-size: 18px;
          color: var(--primary);
          font-weight: 500;
        }
        @media (max-width: 900px) {
          .home-layout {
            grid-template-columns: 1fr;
          }
          .home-monster-col {
            position: static;
          }
        }
      `}</style>
    </div>
  )

  // ===== 答题 =====
  const renderQuiz = () => {
    const currentQuestion = quizList[currentIndex]
    if (!currentQuestion) {
      return (
        <div className="home-quiz-wrap">
          <div className="card home-empty-card">
            {loading ? '加载中...' : '暂无题目'}
            <button className="btn btn-secondary" onClick={handleBackToSelect} style={{ marginTop: 12 }}>
              返回
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="home-quiz-wrap">
        <div className="quiz-top-bar">
          <button className="btn btn-secondary quiz-back-btn" onClick={handleBackToSelect}>
            退出
          </button>
          <div className="quiz-subject-info">
            <span>{currentSubject?.icon}</span>
            <span>{currentSubject?.name}</span>
          </div>
          <div className="quiz-stats-inline">
            <span className="badge badge-success">{stats.correct} 对</span>
            <span className="badge badge-warning">+{stats.totalExp} EXP</span>
            {stats.totalCoins > 0 && <span className="badge badge-warning">+{stats.totalCoins} 💰</span>}
            {currentResult && currentResult.combo > 1 && <span className="badge badge-danger">{currentResult.combo} 连击</span>}
          </div>
        </div>

        <QuizCard
          question={currentQuestion}
          questionIndex={currentIndex}
          totalQuestions={quizList.length}
          onSubmit={handleSubmitAnswer}
          disabled={!!currentResult}
          isCorrect={quizIsCorrect}
          correctAnswerIndex={currentResult?.correctAnswer}
          correctAnswerText={currentResult?.correctAnswerText}
          explanation={currentResult?.explanation}
          chestDrop={quizChestDrop}
          onChestOpen={handleChestOpen}
          droppedCards={currentResult?.droppedCards ?? null}
          pendingStoryChoices={currentResult?.pendingStoryChoices ?? null}
        />

        {currentResult && (
          <div className={'quiz-feedback' + (currentResult.isCorrect ? ' correct' : ' wrong')}>
            <div className="feedback-head">
              <span className="feedback-title">
                {currentResult.isCorrect ? '回答正确' : '回答错误'}
              </span>
            </div>
            <div className="feedback-body">
              {!currentResult.isCorrect && (
                <p className="feedback-correct-answer">
                  正确答案：
                  <strong>
                    {currentResult.correctAnswerText
                      ? currentResult.correctAnswerText
                      : `${String.fromCharCode(65 + currentResult.correctAnswer)}. ${currentQuestion.options[currentResult.correctAnswer]}`
                    }
                  </strong>
                </p>
              )}
              {currentResult.explanation && (
                <p className="feedback-explanation" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{currentResult.explanation}</p>
              )}
              {currentResult.expGained > 0 && (
                <p className="feedback-exp">+{currentResult.expGained} EXP</p>
              )}
              {currentResult.coinsGained > 0 && (
                <p className="feedback-coins">+{currentResult.coinsGained} 💰 金币</p>
              )}
              {currentResult.combo > 1 && (
                <p className="feedback-combo">{currentResult.combo} 连击</p>
              )}
              {currentResult.levelUp && (
                <p className="feedback-levelup">怪兽升级到 Lv.{currentResult.levelUp.newLevel}</p>
              )}
            </div>
            <button className="btn btn-primary feedback-next-btn" onClick={handleNext}>
              {currentIndex + 1 >= quizList.length ? '完成答题' : '下一题'}
            </button>
          </div>
        )}

        <style>{`
          .home-quiz-wrap {
            max-width: 720px;
            margin: 0 auto;
          }
          .quiz-top-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }
          .quiz-back-btn {
            padding: 6px 14px;
            font-size: 13px;
          }
          .quiz-subject-info {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
          }
          .quiz-stats-inline {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }
          .home-empty-card {
            text-align: center;
            padding: 32px 24px;
            color: var(--text-secondary);
            font-size: 14px;
          }
          .quiz-feedback {
            margin: 16px auto 0;
            max-width: 680px;
            padding: 16px 20px;
            border-radius: var(--radius);
            border: 1px solid;
          }
          .quiz-feedback.correct {
            background: var(--success-light);
            border-color: var(--success);
          }
          .quiz-feedback.wrong {
            background: var(--danger-light);
            border-color: var(--danger);
          }
          .feedback-head {
            margin-bottom: 8px;
          }
          .quiz-feedback.correct .feedback-title { color: var(--success); font-weight: 600; font-size: 15px; }
          .quiz-feedback.wrong .feedback-title { color: var(--danger); font-weight: 600; font-size: 15px; }
          .feedback-body p {
            margin-bottom: 4px;
            font-size: 14px;
            color: var(--text-primary);
          }
          .feedback-correct-answer strong {
            color: var(--success);
          }
          .feedback-exp { color: var(--warning); font-weight: 500; }
          .feedback-coins { color: var(--warning); font-weight: 500; }
          .feedback-combo { color: var(--danger); font-weight: 500; }
          .feedback-levelup { color: var(--primary); font-weight: 600; }
          .feedback-next-btn {
            margin-top: 12px;
            width: 100%;
          }
        `}</style>
      </div>
    )
  }

  // ===== 答题结果 =====
  const renderResult = () => {
    const total = quizList.length
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0

    return (
      <div className="home-result">
        <div className="card result-card">
          <h2 className="result-title">答题完成</h2>

          <div className="result-score">
            <span className="score-correct">{stats.correct}</span>
            <span className="score-divider">/</span>
            <span className="score-total">{total}</span>
          </div>
          <p className="result-accuracy">正确率 {accuracy}%</p>

          <div className="result-stats">
            <div className="result-stat-item">
              <div className="stat-value">+{stats.totalExp}</div>
              <div className="stat-label">经验</div>
            </div>
            <div className="result-stat-item">
              <div className="stat-value">{stats.maxCombo}</div>
              <div className="stat-label">最高连击</div>
            </div>
            <div className="result-stat-item">
              <div className="stat-value">{accuracy}%</div>
              <div className="stat-label">正确率</div>
            </div>
          </div>

          {stats.totalCoins > 0 && (
            <p className="result-coins">获得 {stats.totalCoins} 金币</p>
          )}

          <p className="result-message">
            {accuracy === 100
              ? '全部答对，表现优秀'
              : accuracy >= 60
              ? '继续加油，还有进步空间'
              : '别灰心，多练习就会进步'}
          </p>

          <button className="btn btn-primary result-back-btn" onClick={handleBackToSelect}>
            返回学科选择
          </button>
        </div>

        {currentResult && currentResult.evolution && (
          <EvolutionModal result={currentResult} onClose={handleBackToSelect} />
        )}

        <style>{`
          .home-result {
            max-width: 480px;
            margin: 0 auto;
          }
          .result-card {
            text-align: center;
            padding: 32px 28px;
          }
          .result-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 20px;
          }
          .result-score {
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 4px;
            margin-bottom: 4px;
          }
          .score-correct {
            font-size: 44px;
            font-weight: 700;
            color: var(--success);
          }
          .score-divider {
            font-size: 28px;
            color: var(--text-muted);
          }
          .score-total {
            font-size: 28px;
            font-weight: 600;
            color: var(--text-secondary);
          }
          .result-accuracy {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 20px;
          }
          .result-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          .result-stat-item {
            padding: 14px 8px;
            background: var(--bg-muted);
            border-radius: var(--radius);
          }
          .stat-value {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
          }
          .stat-label {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 2px;
          }
          .result-coins {
            font-size: 16px;
            font-weight: 600;
            color: var(--warning);
            margin-bottom: 12px;
          }
          .result-message {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 20px;
            padding: 10px;
            background: var(--bg-muted);
            border-radius: var(--radius);
          }
          .result-back-btn {
            width: 100%;
            padding: 12px;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="home-page">
      {error && (
        <div className="home-error-bar">
          <span>{error}</span>
          <button className="error-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {phase === 'select' && renderSelect()}
      {phase === 'quiz' && renderQuiz()}
      {phase === 'result' && renderResult()}

      <AiQuestionModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        subjects={subjects}
        onQuestionsGenerated={handleAiQuestionsGenerated}
      />

      <style>{`
        .home-page {
          width: 100%;
        }
        .home-error-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: var(--danger-light);
          color: var(--danger);
          border-radius: var(--radius);
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 500;
        }
        .error-close {
          background: transparent;
          color: var(--danger);
          font-size: 18px;
          line-height: 1;
          padding: 0 4px;
        }
      `}</style>
    </div>
  )
}