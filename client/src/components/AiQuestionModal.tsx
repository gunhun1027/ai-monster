// AI出题配置弹窗
import { useState } from 'react'
import { aiQuestionApi } from '../services/api'
import type { Question } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  subjects: Array<{ id: string; name: string }>
  onQuestionsGenerated: (questions: Question[], subjectName: string) => void
}

const PRESET_TOPICS: Record<string, string[]> = {
  '英语': ['英语时态', '被动语态', '阅读理解', '完形填空', '词汇辨析'],
  '数学': ['初中几何', '函数与方程', '概率统计', '数列', '立体几何'],
  '语文': ['古诗词鉴赏', '文言文阅读', '现代文阅读', '作文技巧', '成语辨析'],
  '历史': ['中国古代史', '世界近现代史', '秦汉魏晋', '唐宋元明清', '近代中国'],
}

export default function AiQuestionModal({ isOpen, onClose, subjects, onQuestionsGenerated }: Props) {
  const [subjectName, setSubjectName] = useState('英语')
  const [topic, setTopic] = useState('英语时态')
  const [difficulty, setDifficulty] = useState(2)
  const [count, setCount] = useState(5)
  const [questionType, setQuestionType] = useState<'choice' | 'fillblank' | 'mixed'>('mixed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoNotice, setDemoNotice] = useState(false)

  if (!isOpen) return null

  const presetTopics = PRESET_TOPICS[subjectName] || ['综合知识点']

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('请输入知识点')
      return
    }
    setLoading(true)
    setError('')
    setDemoNotice(false)

    try {
      const selectedSubject = subjects.find((s) => s.name === subjectName)
      const res = await aiQuestionApi.generate({
        subjectName,
        topic: topic.trim(),
        difficulty,
        count,
        questionType,
        subjectId: selectedSubject?.id,
      })

      if (res.demoMode) {
        setDemoNotice(true)
      }

      onQuestionsGenerated(res.questions, subjectName)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card ai-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            <span style={{ marginRight: 6 }}>🤖</span>AI 智能出题
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 学科选择 */}
          <div className="form-group">
            <label className="form-label">学科</label>
            <div className="ai-chip-group">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  className={`ai-chip ${subjectName === s.name ? 'active' : ''}`}
                  onClick={() => {
                    setSubjectName(s.name)
                    setTopic(PRESET_TOPICS[s.name]?.[0] || '综合知识点')
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 知识点 */}
          <div className="form-group">
            <label className="form-label">知识点</label>
            <input
              type="text"
              className="form-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：英语时态、初中几何..."
            />
            <div className="ai-preset-tags">
              {presetTopics.map((t) => (
                <button
                  key={t}
                  className={`ai-preset-tag ${topic === t ? 'active' : ''}`}
                  onClick={() => setTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 难度 */}
          <div className="form-group">
            <label className="form-label">难度</label>
            <div className="ai-difficulty-group">
              {['入门', '基础', '中等', '较难', '困难'].map((label, i) => (
                <button
                  key={label}
                  className={`ai-difficulty-btn ${difficulty === i + 1 ? 'active' : ''}`}
                  onClick={() => setDifficulty(i + 1)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 数量 */}
          <div className="form-group">
            <label className="form-label">题目数量</label>
            <div className="ai-count-group">
              {[3, 5, 8, 10].map((n) => (
                <button
                  key={n}
                  className={`ai-count-btn ${count === n ? 'active' : ''}`}
                  onClick={() => setCount(n)}
                >
                  {n} 题
                </button>
              ))}
            </div>
          </div>

          {/* 题型 */}
          <div className="form-group">
            <label className="form-label">题型</label>
            <div className="ai-type-group">
              <button
                className={`ai-type-btn ${questionType === 'choice' ? 'active' : ''}`}
                onClick={() => setQuestionType('choice')}
              >
                单选题
              </button>
              <button
                className={`ai-type-btn ${questionType === 'fillblank' ? 'active' : ''}`}
                onClick={() => setQuestionType('fillblank')}
              >
                填空题
              </button>
              <button
                className={`ai-type-btn ${questionType === 'mixed' ? 'active' : ''}`}
                onClick={() => setQuestionType('mixed')}
              >
                混合
              </button>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          {demoNotice && (
            <p className="form-notice">
              当前为演示模式，使用内置模板生成题目。如需接入真实AI，请配置 AI_API_KEY 环境变量。
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-inline" /> AI生成中...
              </>
            ) : (
              <>✨ 生成题目</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--text-primary) 50%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 16px;
        }
        .modal-card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          animation: modal-in 0.2s var(--ease-slide);
        }
        @keyframes modal-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .modal-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .modal-close {
          background: transparent;
          color: var(--text-muted);
          font-size: 20px;
          line-height: 1;
          padding: 0 4px;
          cursor: pointer;
        }
        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding: 12px 20px 16px;
          border-top: 1px solid var(--border);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--bg-muted);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
        }
        .form-input:focus {
          border-color: var(--primary);
        }
        .form-error {
          color: var(--danger);
          font-size: 13px;
          margin-top: 4px;
        }
        .form-notice {
          color: var(--warning);
          font-size: 12px;
          padding: 8px 12px;
          background: var(--warning-light);
          border-radius: var(--radius);
        }
        .ai-chip-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ai-chip {
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
          background: var(--bg-muted);
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ai-chip.active {
          background: var(--primary);
          color: var(--text-on-primary);
          border-color: var(--primary);
        }
        .ai-preset-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        .ai-preset-tag {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ai-preset-tag.active {
          background: var(--success-light);
          color: var(--success);
          border-color: var(--success);
        }
        .ai-difficulty-group, .ai-count-group, .ai-type-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ai-difficulty-btn, .ai-count-btn, .ai-type-btn {
          padding: 6px 14px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--bg-muted);
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          flex: 1;
          min-width: 60px;
        }
        .ai-difficulty-btn.active, .ai-count-btn.active, .ai-type-btn.active {
          background: var(--primary);
          color: var(--text-on-primary);
          border-color: var(--primary);
        }
        .spinner-inline {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid color-mix(in srgb, var(--bg-card) 30%, transparent);
          border-top-color: var(--text-on-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 6px;
          vertical-align: middle;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
