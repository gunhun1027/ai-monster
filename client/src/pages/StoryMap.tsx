// 知识大陆页面 - 剧情系统主入口
import { useState, useEffect, useCallback } from 'react'
import { storyApi, npcApi, questionApi, quizApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { withTimeout } from '../hooks/useGame'
import StoryNodePath from '../components/StoryNodePath'
import NpcMentorCard from '../components/NpcMentorCard'
import NpcDialogModal from '../components/NpcDialogModal'
import QuizCard from '../components/QuizCard'
import CardDropAnimation from '../components/CardDropAnimation'
import StoryChoiceModal from '../components/StoryChoiceModal'
import type {
  StoryChapter,
  StoryNodeInfo,
  StoryChapterDetailResponse,
  NpcMentor,
  NpcStoryDialog,
  Question,
  QuizResult,
  StoryCompleteResponse,
} from '../types'

type Phase = 'chapters' | 'nodes' | 'quiz' | 'complete'

export default function StoryMap() {
  const { updateUser } = useAuth()
  const [phase, setPhase] = useState<Phase>('chapters')
  const [chapters, setChapters] = useState<StoryChapter[]>([])
  const [totalStars, setTotalStars] = useState(0)
  const [loading, setLoading] = useState(true)

  // 节点详情
  const [chapterDetail, setChapterDetail] = useState<StoryChapterDetailResponse | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(null)

  // 答题状态
  const [selectedNode, setSelectedNode] = useState<StoryNodeInfo | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentResult, setCurrentResult] = useState<QuizResult | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [nodeCompleteResult, setNodeCompleteResult] = useState<StoryCompleteResponse | null>(null)

  // NPC状态
  const [mentors, setMentors] = useState<NpcMentor[]>([])
  const [dialogMentor, setDialogMentor] = useState<NpcMentor | null>(null)
  const [storyDialogs, setStoryDialogs] = useState<NpcStoryDialog[] | undefined>(undefined)

  // 剧情系统 v2：通关后的卡片掉落与剧情选择弹窗
  const [showCompleteCardDrop, setShowCompleteCardDrop] = useState(false)
  const [showCompleteStoryChoice, setShowCompleteStoryChoice] = useState(false)

  // 通关结果到达后，若存在掉落卡片，延迟展示掉落动画
  useEffect(() => {
    if (nodeCompleteResult?.droppedCards && nodeCompleteResult.droppedCards.length > 0) {
      const timer = setTimeout(() => setShowCompleteCardDrop(true), 800)
      return () => clearTimeout(timer)
    }
  }, [nodeCompleteResult])

  const handleCompleteCardDrop = useCallback(() => {
    setShowCompleteCardDrop(false)
    if (nodeCompleteResult?.pendingStoryChoices && nodeCompleteResult.pendingStoryChoices.length > 0) {
      setShowCompleteStoryChoice(true)
    }
  }, [nodeCompleteResult])

  // 加载章节列表
  const loadChapters = useCallback(async () => {
    try {
      const data = await storyApi.chapters()
      setChapters(data.chapters)
      setTotalStars(data.totalStars)
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载NPC列表
  const loadMentors = useCallback(async () => {
    try {
      const data = await npcApi.mentors()
      setMentors(data.mentors)
    } catch (err) {
    }
  }, [])

  useEffect(() => {
    loadChapters()
    loadMentors()
  }, [loadChapters, loadMentors])

  // 点击大陆 - 加载节点详情
  const handleSelectChapter = async (chapter: StoryChapter) => {
    try {
      const detail = await storyApi.chapterNodes(chapter.id)
      setChapterDetail(detail)
      setSelectedChapter(chapter)
      setPhase('nodes')
    } catch (err) {
    }
  }

  // 点击节点 - 开始答题
  const handleSelectNode = async (node: StoryNodeInfo) => {
    if (!chapterDetail || !selectedChapter) return
    try {
      // 通过 subjectName 找到 subjectId（从 chapters 列表中获取）
      const subjectChapter = chapters.find((c) => c.id === selectedChapter.id)
      if (!subjectChapter) return

      // 从 subjectName 获取 subjectId - 使用 questionApi.random 需要 subjectId
      // 我们可以通过 subjects API 获取，但这里直接用章节关联
      // chapterDetail.chapter 没有 subjectId，但 chapters 列表有 subjectName
      // 实际上后端 storyChapter 有 subjectId，但前端类型没暴露
      // 临时方案：通过 questionApi 用 subjectName 匹配
      // 更好的方案：在后端 StoryChapter 类型中返回 subjectId

      // 简化：直接获取所有学科，找到匹配的
      const { subjectApi } = await import('../services/api')
      const subjectsResp = await subjectApi.list()
      const subject = subjectsResp.subjects.find((s) => s.name === subjectChapter.subjectName)
      if (!subject) {
        return
      }

      const qs = await questionApi.random(subject.id, node.questionCount)
      setQuestions(qs.questions)
      setSelectedNode(node)
      setCurrentIndex(0)
      setCorrectCount(0)
      setCurrentResult(null)
      setPhase('quiz')
    } catch (err) {
    }
  }

  // 提交答案
  const handleSubmitAnswer = async (selectedOption: number, timeTaken: number, fillblankAnswer?: string) => {
    const currentQuestion = questions[currentIndex]
    if (!currentQuestion || !selectedNode) return

    try {
      const result = await withTimeout(
        quizApi.submit(currentQuestion.id, selectedOption, timeTaken, fillblankAnswer),
        8000,
        '提交超时，请检查网络后重试'
      )
      setCurrentResult(result)
      if (result.isCorrect) {
        setCorrectCount((prev) => prev + 1)
      }
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
    } catch (err) {
      throw err
    }
  }

  // 下一题
  const handleNext = () => {
    if (!selectedNode) return
    setCurrentResult(null)
    if (currentIndex + 1 >= questions.length) {
      // 答题完成，调用完成节点接口
      completeNode()
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  // 完成节点
  const completeNode = async () => {
    if (!selectedNode) return
    try {
      const result = await storyApi.completeNode(selectedNode.id, {
        score: correctCount,
        correctCount,
        totalCount: questions.length,
      })
      setNodeCompleteResult(result)
      setTotalStars(result.totalStars || totalStars)

      // 如果通关，获取NPC剧情对话
      if (result.isPassed && selectedChapter) {
        try {
          const dialogsResp = await npcApi.storyDialogs(selectedChapter.id, selectedNode.id)
          setStoryDialogs(dialogsResp.dialogs)
        } catch (err) {
        }
      }
      setPhase('complete')
    } catch (err) {
      setPhase('complete')
    }
  }

  // 返回章节列表
  const handleBackToChapters = () => {
    setPhase('chapters')
    setSelectedChapter(null)
    setChapterDetail(null)
    setStoryDialogs(undefined)
    setNodeCompleteResult(null)
    loadChapters() // 刷新进度
  }

  // 返回节点列表
  const handleBackToNodes = () => {
    setPhase('nodes')
    setSelectedNode(null)
    setStoryDialogs(undefined)
    setNodeCompleteResult(null)
    if (selectedChapter) {
      storyApi.chapterNodes(selectedChapter.id).then(setChapterDetail).catch(console.error)
    }
  }

  // 点击NPC导师
  const handleMentorClick = (mentor: NpcMentor) => {
    setDialogMentor(mentor)
    setStoryDialogs(undefined)
  }

  // ===== 渲染 =====

  if (loading) {
    return (
      <div className="story-page">
        <div className="story-loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="story-page">
      {/* 顶部标题栏 */}
      <div className="story-header">
        <div className="story-title-area">
          {phase !== 'chapters' && (
            <button className="story-back-btn" onClick={phase === 'quiz' || phase === 'complete' ? handleBackToNodes : handleBackToChapters}>
              ← 返回
            </button>
          )}
          <h1 className="story-title">知识大陆</h1>
          <div className="story-stars">
            <span className="stars-icon">⭐</span>
            <span className="stars-count">{totalStars}</span>
          </div>
        </div>
        <p className="story-subtitle">驱散遗忘迷雾，拯救知识大陆</p>
      </div>

      {/* 章节列表 */}
      {phase === 'chapters' && (
        <div className="story-content">
          <div className="chapters-grid">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                className={`chapter-card ${!chapter.isUnlocked ? 'chapter-locked' : ''}`}
                onClick={() => chapter.isUnlocked && handleSelectChapter(chapter)}
                disabled={!chapter.isUnlocked}
                style={{ ['--chapter-color' as string]: chapter.themeColor }}
              >
                <div className="chapter-icon">{chapter.icon}</div>
                <div className="chapter-body">
                  <div className="chapter-name">{chapter.name}</div>
                  <div className="chapter-desc">{chapter.description}</div>
                  <div className="chapter-progress">
                    <div className="chapter-progress-bar">
                      <div className="chapter-progress-fill" style={{ width: `${chapter.progressPercent}%`, background: chapter.themeColor }} />
                    </div>
                    <span className="chapter-progress-text">{chapter.unlockedNodes}/{chapter.totalNodes}</span>
                  </div>
                  <div className="chapter-subject">{chapter.subjectIcon} {chapter.subjectName}</div>
                </div>
                {!chapter.isUnlocked && <div className="chapter-lock">🔒</div>}
              </button>
            ))}
          </div>

          {/* NPC导师区 */}
          <div className="mentors-section">
            <h2 className="section-title">导师指引</h2>
            <div className="mentors-grid">
              {mentors.map((mentor) => (
                <NpcMentorCard key={mentor.id} mentor={mentor} onClick={handleMentorClick} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 节点路径 */}
      {phase === 'nodes' && chapterDetail && selectedChapter && (
        <div className="story-content">
          <div className="chapter-detail-header" style={{ background: `linear-gradient(135deg, ${selectedChapter.themeColor}20, transparent)` }}>
            <div className="chapter-detail-icon">{selectedChapter.icon}</div>
            <div>
              <h2 className="chapter-detail-name">{chapterDetail.chapter.name}</h2>
              <p className="chapter-detail-desc">{chapterDetail.chapter.description}</p>
            </div>
          </div>
          <StoryNodePath
            nodes={chapterDetail.nodes}
            themeColor={selectedChapter.themeColor}
            userStars={chapterDetail.userStars}
            onSelectNode={handleSelectNode}
          />
        </div>
      )}

      {/* 答题模式 */}
      {phase === 'quiz' && selectedNode && questions[currentIndex] && (
        <div className="story-content story-quiz">
          <div className="story-quiz-header">
            <span className="quiz-node-name">{selectedNode.name}</span>
            <span className="quiz-progress">{currentIndex + 1}/{questions.length}</span>
            <span className="quiz-correct">{correctCount} 正确</span>
          </div>
          <QuizCard
            question={questions[currentIndex]}
            questionIndex={currentIndex}
            totalQuestions={questions.length}
            onSubmit={handleSubmitAnswer}
            disabled={!!currentResult}
            isCorrect={currentResult?.isCorrect ?? null}
            correctAnswerIndex={currentResult?.correctAnswer}
            correctAnswerText={currentResult?.correctAnswerText}
            explanation={currentResult?.explanation}
            chestDrop={currentResult?.chestDrop ?? null}
            onChestOpen={() => {}}
            droppedCards={currentResult?.droppedCards ?? null}
            pendingStoryChoices={currentResult?.pendingStoryChoices ?? null}
          />
          {currentResult && (
            <div className="quiz-next-area">
              <button className="btn btn-primary" onClick={handleNext}>
                {currentIndex + 1 >= questions.length ? '完成挑战' : '下一题'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 完成结果 */}
      {phase === 'complete' && selectedNode && (
        <div className="story-content story-complete">
          <div className={`complete-card ${nodeCompleteResult?.isPassed ? 'passed' : 'failed'}`}>
            <div className="complete-icon">
              {nodeCompleteResult?.isPassed ? (selectedNode.isBoss ? '👑' : '⭐') : '💪'}
            </div>
            <h2 className="complete-title">
              {nodeCompleteResult?.isPassed ? '通关成功！' : '再接再厉'}
            </h2>
            <p className="complete-message">{nodeCompleteResult?.message}</p>
            {nodeCompleteResult?.isPassed && (
              <div className="complete-stats">
                <div className="complete-stat">
                  <span className="stat-label">正确率</span>
                  <span className="stat-value">{Math.round((correctCount / questions.length) * 100)}%</span>
                </div>
                <div className="complete-stat">
                  <span className="stat-label">答对</span>
                  <span className="stat-value">{correctCount}/{questions.length}</span>
                </div>
                {nodeCompleteResult.earnedStars && nodeCompleteResult.earnedStars > 0 && (
                  <div className="complete-stat highlight">
                    <span className="stat-label">获得星星</span>
                    <span className="stat-value">+{nodeCompleteResult.earnedStars} ⭐</span>
                  </div>
                )}
              </div>
            )}
            <div className="complete-actions">
              {storyDialogs && storyDialogs.length > 0 && dialogMentor === null && selectedChapter && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const mentor = mentors.find((m) => m.subjectName === selectedChapter.subjectName)
                    if (mentor) setDialogMentor(mentor)
                  }}
                >
                  查看导师对话
                </button>
              )}
              <button className="btn btn-primary" onClick={handleBackToNodes}>
                继续探索
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NPC对话弹窗 */}
      {dialogMentor && (
        <NpcDialogModal
          mentor={dialogMentor}
          storyDialogs={storyDialogs}
          onClose={() => {
            setDialogMentor(null)
            setStoryDialogs(undefined)
          }}
        />
      )}

      {/* 剧情系统 v2：通关卡片掉落动画 */}
      {showCompleteCardDrop && nodeCompleteResult?.droppedCards && nodeCompleteResult.droppedCards.length > 0 && (
        <CardDropAnimation
          cards={nodeCompleteResult.droppedCards}
          onComplete={handleCompleteCardDrop}
        />
      )}

      {/* 剧情系统 v2：通关剧情选择弹窗 */}
      {showCompleteStoryChoice && nodeCompleteResult?.pendingStoryChoices && nodeCompleteResult.pendingStoryChoices.length > 0 && (
        <StoryChoiceModal
          choices={nodeCompleteResult.pendingStoryChoices}
          onComplete={() => setShowCompleteStoryChoice(false)}
          onSkip={() => setShowCompleteStoryChoice(false)}
        />
      )}

      <style>{`
        .story-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px 20px 48px;
        }
        .story-loading {
          text-align: center;
          padding: 60px;
          color: var(--text-secondary);
        }
        .story-header {
          margin-bottom: 24px;
        }
        .story-title-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .story-back-btn {
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-primary);
          padding: 6px 14px;
          border-radius: var(--radius);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .story-back-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .story-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          flex: 1;
        }
        .story-stars {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
          background: var(--warning-light, color-mix(in srgb, var(--warning) 10%, transparent));
          border-radius: var(--radius-full);
        }
        .stars-icon { font-size: 16px; }
        .stars-count { font-weight: 700; color: var(--warning); }
        .story-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 6px;
        }
        .story-content { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* 章节卡片 */
        .chapters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .chapter-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px;
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          cursor: pointer;
          transition: all 0.25s var(--ease-slide);
          text-align: left;
          position: relative;
          overflow: hidden;
        }
        .chapter-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--chapter-color, var(--primary));
        }
        .chapter-card:hover:not(:disabled) {
          border-color: var(--chapter-color, var(--primary));
          transform: translateY(-3px);
          box-shadow: var(--shadow-float);
        }
        .chapter-card:disabled { cursor: not-allowed; opacity: 0.6; }
        .chapter-icon {
          font-size: 32px;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-muted);
          border-radius: var(--radius);
          flex-shrink: 0;
        }
        .chapter-body { flex: 1; min-width: 0; }
        .chapter-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .chapter-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 10px;
        }
        .chapter-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .chapter-progress-bar {
          flex: 1;
          height: 6px;
          background: var(--border);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .chapter-progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.4s var(--ease-slide);
        }
        .chapter-progress-text {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
        }
        .chapter-subject {
          font-size: 12px;
          color: var(--text-tertiary, var(--text-secondary));
        }
        .chapter-lock {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 18px;
        }

        /* NPC导师区 */
        .mentors-section { margin-top: 16px; }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
        }
        .mentors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        /* 节点详情头部 */
        .chapter-detail-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: var(--radius-lg);
          margin-bottom: 8px;
        }
        .chapter-detail-icon { font-size: 40px; }
        .chapter-detail-name {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .chapter-detail-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        /* 答题模式 */
        .story-quiz-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 16px;
        }
        .quiz-node-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          flex: 1;
        }
        .quiz-progress, .quiz-correct {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .quiz-correct { color: var(--success); font-weight: 500; }
        .quiz-next-area {
          display: flex;
          justify-content: center;
          margin-top: 16px;
        }

        /* 完成结果 */
        .story-complete {
          display: flex;
          justify-content: center;
          padding-top: 32px;
        }
        .complete-card {
          width: 100%;
          max-width: 480px;
          padding: 32px;
          border-radius: var(--radius-lg);
          text-align: center;
          background: var(--bg-card);
          border: 2px solid var(--border);
        }
        .complete-card.passed {
          border-color: var(--success);
          background: var(--success-light);
        }
        .complete-card.failed {
          border-color: var(--warning, #f59e0b);
        }
        .complete-icon {
          font-size: 56px;
          margin-bottom: 12px;
        }
        .complete-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .complete-message {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
        .complete-stats {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .complete-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .complete-stat.highlight .stat-value {
          color: var(--warning);
        }
        .complete-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  )
}
