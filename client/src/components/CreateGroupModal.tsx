// 创建小组弹窗 - 输入小组名称、描述、选择头像 emoji
import { useState } from 'react'
import type { CreateGroupRequest } from '../types'

interface CreateGroupModalProps {
  open: boolean
  onClose: () => void
  onCreated: (groupId: string) => void
  onCreate: (data: CreateGroupRequest) => Promise<{ group: { id: string } }>
}

// 备选小组头像 emoji
const AVATAR_OPTIONS = [
  '🛡️', '⚔️', '🏹', '🗡️', '🪄', '📜', '📚', '🎓',
  '🦉', '🐉', '🦅', '🐺', '🦊', '🦁', '🐯', '🦄',
  '🌟', '⚡', '🔥', '💧', '🌿', '🌈', '🎯', '🏆',
]

export default function CreateGroupModal({ open, onClose, onCreated, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState('🛡️')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = async () => {
    setError('')
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('请输入小组名称')
      return
    }
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      setError('小组名称需 2-30 个字符')
      return
    }
    if (description.length > 200) {
      setError('小组描述最多 200 个字符')
      return
    }
    setSubmitting(true)
    try {
      const result = await onCreate({ name: trimmedName, description: description.trim() || undefined, avatar })
      setName('')
      setDescription('')
      setAvatar('🛡️')
      onCreated(result.group.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setError('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>创建学习小组</h3>
          <button className="modal-close-btn" onClick={handleClose} aria-label="关闭">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* 预览头像 */}
          <div className="avatar-preview-wrap">
            <div className="avatar-preview">{avatar}</div>
            <div className="avatar-preview-label">小组头像预览</div>
          </div>

          {/* 选择头像 emoji */}
          <div className="form-field">
            <label className="form-label">选择头像</label>
            <div className="avatar-options-grid">
              {AVATAR_OPTIONS.map((em) => (
                <button
                  key={em}
                  className={'avatar-option' + (em === avatar ? ' selected' : '')}
                  onClick={() => setAvatar(em)}
                  type="button"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* 小组名称 */}
          <div className="form-field">
            <label className="form-label">小组名称 <span className="required">*</span></label>
            <input
              className="input"
              type="text"
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：英语单词突击队"
              autoFocus
            />
            <div className="input-meta">{name.length}/30</div>
          </div>

          {/* 小组描述 */}
          <div className="form-field">
            <label className="form-label">小组描述</label>
            <textarea
              className="input textarea"
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="介绍一下你们小组的学习目标、规则..."
              rows={3}
            />
            <div className="input-meta">{description.length}/200</div>
          </div>

          {error && (
            <div className="form-error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="7" cy="10" r="0.7" fill="currentColor"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose} disabled={submitting}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '创建中...' : '创建小组'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--text-primary) 50%, transparent);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-content {
          background: var(--bg-card);
          border-radius: var(--radius-lg, 16px);
          box-shadow: var(--shadow-float);
          max-width: 560px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s var(--ease-slide, cubic-bezier(0.16, 1, 0.3, 1));
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 12px;
          border-bottom: 1px solid var(--border);
        }
        .modal-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .modal-close-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.15s;
        }
        .modal-close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px 20px;
          border-top: 1px solid var(--border);
        }
        .avatar-preview-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }
        .avatar-preview {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-lg, 16px);
          background: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          margin-bottom: 8px;
          transition: transform 0.2s;
        }
        .avatar-preview:hover {
          transform: scale(1.05);
        }
        .avatar-preview-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .form-field {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .required {
          color: var(--danger);
        }
        .input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--bg-muted);
          color: var(--text-primary);
          font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
          background: var(--bg-card);
        }
        .textarea {
          resize: vertical;
          min-height: 70px;
          font-family: inherit;
        }
        .input-meta {
          font-size: 11px;
          color: var(--text-muted);
          text-align: right;
          margin-top: 4px;
        }
        .avatar-options-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 6px;
        }
        .avatar-option {
          aspect-ratio: 1;
          font-size: 20px;
          background: var(--bg-muted);
          border: 1.5px solid transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .avatar-option:hover {
          background: var(--bg-hover);
          transform: scale(1.1);
        }
        .avatar-option.selected {
          border-color: var(--primary);
          background: var(--primary-light);
          transform: scale(1.1);
          box-shadow: 0 0 0 2px var(--primary-light);
        }
        .form-error {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px;
          background: var(--danger-light);
          color: var(--danger);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 12px;
        }
        @media (max-width: 480px) {
          .avatar-options-grid {
            grid-template-columns: repeat(6, 1fr);
          }
          .modal-content {
            border-radius: var(--radius) var(--radius) 0 0;
            margin-top: auto;
            max-height: 85vh;
          }
          .modal-overlay {
            align-items: flex-end;
            padding: 0;
          }
        }
      `}</style>
    </div>
  )
}
