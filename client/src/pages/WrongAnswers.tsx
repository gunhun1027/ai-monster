// 错题本页面
import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../hooks/useGame'
import { wrongAnswerApi, subjectApi, quizApi } from '../services/api'
import type { WrongAnswerItem, Subject, ReviewQuestion, QuizResult } from '../types'

type Phase = 'list' | 'review'

export default function WrongAnswers() {
  const { subjects, fetchSubjects, submitAnswer } = useGame()
  const [phase, setPhase] = useState<Phase>('list')
  const [items, setItems] = useState<WrongAnswerItem[]>([])
  const [total, setTotal] = useState(0)
  const [masteredCount, setMasteredCount] = useState(0)
  const [unmasteredCount, setUnmasteredCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [masteredFilter, setMasteredFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 复习模式状态
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [currentResult, setCurrentResult] = useState<QuizResult | null>(null)
  const [quizIsCorrect, setQuizIsCorrect] = useState<boolean | null>(null)
  const [reviewStats, setReviewStats] = useState({ correct: 0, total: 0 })

  const loadItems = useCallback(async (p: number = page, sid: string = subjectFilter, m: string = masteredFilter) => {
    setLoading(true)
    try {
      const data = await wrongAnswerApi.list(p, 20, sid, m)
      setItems(data.items)
      setTotal(data.total)
      setMasteredCount(data.masteredCount)
      setUnmasteredCount(data.unmasteredCount)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取错题列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, subjectFilter, masteredFilter])

  useEffect(() => { fetchSubjects(); loadItems() }, [fetchSubjects, loadItems])

  // 标记掌握
  const handleMaster = async (id: string) => {
    try {
      await wrongAnswerApi.master(id)
      loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : '标记失败')
    }
  }

  // 开始复习
  const startReview = async () => {
    try {
      const data = await wrongAnswerApi.review(10)
      if (data.questions.length === 0) {
        setError('暂无需要复习的错题')
        return
      }
      setReviewQuestions(data.questions)
      setReviewIndex(0)
      setSelectedOption(null)
      setCurrentResult(null)
      setQuizIsCorrect(null)
      setReviewStats({ correct: 0, total: 0 })
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取复习题目失败')
    }
  }

  // 复习模式：选择选项
  const handleReviewSelect = (index: number) => {
    if (currentResult) return // 已提交则不可再选
    setSelectedOption(index)
  }

  // 复习模式提交答案
  const handleReviewSubmit = async () => {
    const q = reviewQuestions[reviewIndex]
    if (!q || selectedOption === null) return
    try {
      const result = await submitAnswer(q.id, selectedOption, 0)
      setCurrentResult(result)
      setQuizIsCorrect(result.isCorrect)
      setReviewStats(prev => ({
        correct: prev.correct + (result.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }))
      // 答对自动标记为已掌握
      if (result.isCorrect) {
        wrongAnswerApi.master(q.wrongAnswerId).catch(() => {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交答案失败，请稍后重试')
    }
  }

  // 下一题
  const handleReviewNext = () => {
    setCurrentResult(null)
    setQuizIsCorrect(null)
    setSelectedOption(null)
    if (reviewIndex + 1 >= reviewQuestions.length) {
      setPhase('list')
      loadItems()
    } else {
      setReviewIndex(reviewIndex + 1)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch { return dateStr }
  }

  if (phase === 'review') {
    const q = reviewQuestions[reviewIndex]
    if (!q) return null

    const isResultShown = currentResult !== null

    return (
      <div className="wrong-review-page">
        <div className="review-header">
          <button className="btn btn-secondary" onClick={() => { setPhase('list'); loadItems() }}>退出复习</button>
          <span className="review-progress">{reviewIndex + 1} / {reviewQuestions.length}</span>
          <span className="badge badge-success">{reviewStats.correct} 对</span>
        </div>
        <div className="card quiz-card" style={{ maxWidth: 680, margin: '16px auto' }}>
          <div className="quiz-content" style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.7, padding: '16px 0' }}>{q.content}</div>
          <div className="quiz-options" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q.options.map((opt, i) => {
              let cls = 'quiz-option'
              if (isResultShown) {
                if (i === currentResult?.correctAnswer) cls += ' correct-answer'
                else if (i === selectedOption && !quizIsCorrect) cls += ' wrong-answer'
                else cls += ' dimmed'
              } else {
                if (selectedOption === i) cls += ' selected'
              }
              return (
                <button key={i} className={cls} onClick={() => handleReviewSelect(i)} disabled={isResultShown}>
                  <span className="option-letter" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: '50%', fontWeight: 600, fontSize: 13, flexShrink: 0,
                    background: isResultShown && i === currentResult?.correctAnswer ? 'var(--success)' :
                      isResultShown && i === selectedOption && !quizIsCorrect ? 'var(--danger)' :
                      selectedOption === i ? 'color-mix(in srgb, var(--bg-card) 25%, transparent)' : 'var(--bg-muted)',
                    color: isResultShown && (i === currentResult?.correctAnswer || (i === selectedOption && !quizIsCorrect)) ? 'white' :
                      selectedOption === i ? 'white' : 'var(--text-secondary)',
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {isResultShown && i === currentResult?.correctAnswer && (
                    <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 16, marginLeft: 'auto' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 提交/下一题按钮 */}
          {!isResultShown && (
            <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={handleReviewSubmit} disabled={selectedOption === null}>
              提交答案
            </button>
          )}

          {/* 结果反馈 */}
          {isResultShown && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 'var(--radius)', background: quizIsCorrect ? 'var(--success-light)' : 'var(--danger-light)', border: `1px solid ${quizIsCorrect ? 'var(--success)' : 'var(--danger)'}` }}>
              <p style={{ fontWeight: 600, color: quizIsCorrect ? 'var(--success)' : 'var(--danger)', marginBottom: 4 }}>{quizIsCorrect ? '回答正确' : '回答错误'}</p>
              {!quizIsCorrect && currentResult && <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>正确答案：<strong style={{ color: 'var(--success)' }}>{String.fromCharCode(65 + currentResult.correctAnswer)}. {q.options[currentResult.correctAnswer]}</strong></p>}
              <button className="btn btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={handleReviewNext}>
                {reviewIndex + 1 >= reviewQuestions.length ? '完成复习' : '下一题'}
              </button>
            </div>
          )}
        </div>

        <style>{`
          .wrong-review-page { max-width: 720px; margin: 0 auto; }
          .review-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
          .review-progress { font-size: 14px; font-weight: 600; color: var(--text-secondary); }
          .quiz-option {
            display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px;
            background: var(--bg-card); border: 2px solid var(--border); border-radius: var(--radius);
            font-size: 14px; color: var(--text-primary); text-align: left; cursor: pointer;
            transition: all 0.2s var(--ease-slide);
          }
          .quiz-option:hover:not(.dimmed):not([disabled]) { border-color: var(--primary); background: var(--primary-light); }
          .quiz-option.selected { background: var(--primary); border-color: var(--primary); color: white; }
          .quiz-option.correct-answer { background: var(--success-light); border-color: var(--success); }
          .quiz-option.wrong-answer { background: var(--danger-light); border-color: var(--danger); }
          .quiz-option.dimmed { opacity: 0.5; cursor: not-allowed; }
          .quiz-option:disabled { cursor: not-allowed; }
        `}</style>
      </div>
    )
  }

  // 列表模式
  return (
    <div className="wrong-answers-page">
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 14 }}>
          <span>{error}</span>
          <button style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{total}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>总错题数</div>
        </div>
        <div className="card" style={{ padding: '16px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{masteredCount}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>已掌握</div>
        </div>
        <div className="card" style={{ padding: '16px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{unmasteredCount}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>待复习</div>
        </div>
      </div>

      {/* 工具栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="input" style={{ maxWidth: 180 }} value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); loadItems(1, e.target.value, masteredFilter) }}>
          <option value="">全部学科</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 140 }} value={masteredFilter} onChange={(e) => { setMasteredFilter(e.target.value); setPage(1); loadItems(1, subjectFilter, e.target.value) }}>
          <option value="">全部状态</option>
          <option value="false">待复习</option>
          <option value="true">已掌握</option>
        </select>
        <button className="btn btn-primary" onClick={startReview} disabled={unmasteredCount === 0}>
          开始复习 ({unmasteredCount})
        </button>
      </div>

      {/* 错题列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>加载中...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          {total === 0 ? '暂无错题记录，继续保持！' : '当前筛选条件下无错题'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.6, wordBreak: 'break-word' }}>{item.content}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span className="badge badge-primary" style={{ fontSize: 12 }}>{item.subject.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>错 {item.wrongCount} 次</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(item.lastWrongAt)}</span>
                    {item.mastered && <span className="badge badge-success" style={{ fontSize: 12 }}>已掌握</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {!item.mastered && (
                    <button className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => handleMaster(item.id)}>
                      标记掌握
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => { setPage(page - 1); loadItems(page - 1) }}>上一页</button>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>第 {page} / {totalPages} 页</span>
          <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => { setPage(page + 1); loadItems(page + 1) }}>下一页</button>
        </div>
      )}

      <style>{`
        .wrong-answers-page { max-width: 900px; margin: 0 auto; }
      `}</style>
    </div>
  )
}
