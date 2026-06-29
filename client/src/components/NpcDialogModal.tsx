// NPC对话弹窗 - Galgame风格对话框 + 打字机效果
import { useState, useEffect, useRef, useCallback } from 'react'
import { npcApi } from '../services/api'
import type { NpcMentor, NpcDialog, NpcStoryDialog } from '../types'

interface NpcDialogModalProps {
  mentor: NpcMentor
  onClose: () => void
  storyDialogs?: NpcStoryDialog[] // 外部传入的剧情对话（通关后）
}

const DIALOG_TYPE_COLORS: Record<string, string> = {
  guide: 'var(--info)',
  task: 'var(--warning)',
  story: 'var(--primary)',
  encourage: 'var(--success)',
  explain: 'var(--text-secondary)',
}

export default function NpcDialogModal({ mentor, onClose, storyDialogs }: NpcDialogModalProps) {
  const [historyDialogs, setHistoryDialogs] = useState<NpcDialog[]>([])
  const [currentDialogIndex, setCurrentDialogIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // 构建对话列表：剧情对话优先，否则用历史对话
  const dialogsToShow: { content: string; dialogType: string; avatar: string; name: string }[] =
    storyDialogs && storyDialogs.length > 0
      ? storyDialogs.map((d) => ({
          content: d.content,
          dialogType: 'story',
          avatar: d.avatar,
          name: d.name,
        }))
      : historyDialogs.map((d) => ({
          content: d.content,
          dialogType: d.dialogType,
          avatar: mentor.avatar,
          name: mentor.name,
        }))

  // 加载历史对话
  useEffect(() => {
    if (storyDialogs && storyDialogs.length > 0) return
    let cancelled = false
    npcApi
      .mentorDetail(mentor.id)
      .then((detail) => {
        if (!cancelled) {
          const dialogs = detail.recentDialogs.length > 0
            ? detail.recentDialogs
            : [{ id: 'greeting', dialogType: 'guide' as const, content: detail.mentor.greeting, createdAt: new Date().toISOString() }]
          setHistoryDialogs(dialogs)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [mentor.id, mentor.avatar, storyDialogs])

  // 打字机效果
  const startTyping = useCallback((text: string) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    typingTimerRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1))
        i++
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current)
        setIsTyping(false)
      }
    }, 30)
  }, [])

  // 当前对话变化时启动打字机
  useEffect(() => {
    const current = dialogsToShow[currentDialogIndex]
    if (current) {
      startTyping(current.content)
    }
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDialogIndex, historyDialogs, storyDialogs])

  const handleNext = () => {
    // 如果正在打字，点击直接显示全文
    if (isTyping) {
      const current = dialogsToShow[currentDialogIndex]
      if (current && typingTimerRef.current) {
        clearInterval(typingTimerRef.current)
        setDisplayedText(current.content)
        setIsTyping(false)
      }
      return
    }
    if (currentDialogIndex < dialogsToShow.length - 1) {
      setCurrentDialogIndex((prev) => prev + 1)
    } else {
      onClose()
    }
  }

  const currentDialog = dialogsToShow[currentDialogIndex]
  const isLast = currentDialogIndex >= dialogsToShow.length - 1
  const accentColor = currentDialog ? DIALOG_TYPE_COLORS[currentDialog.dialogType] || 'var(--primary)' : 'var(--primary)'

  if (!currentDialog) {
    return (
      <div className="npc-dialog-overlay" onClick={onClose}>
        <div className="npc-dialog-modal" onClick={(e) => e.stopPropagation()}>
          <div className="npc-dialog-loading">加载对话中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="npc-dialog-overlay" onClick={onClose}>
      <div className="npc-dialog-modal" onClick={(e) => e.stopPropagation()}>
        {/* NPC立绘区域 */}
        <div className="npc-dialog-portrait" style={{ background: `linear-gradient(180deg, ${accentColor}15, transparent)` }}>
          <div className="npc-portrait-avatar" style={{ borderColor: accentColor }}>{currentDialog.avatar}</div>
          <div className="npc-portrait-name">{currentDialog.name}</div>
          <div className="npc-portrait-subject">{mentor.subjectName}</div>
        </div>

        {/* 对话框 */}
        <div className="npc-dialog-box" style={{ borderColor: accentColor }}>
          <div className="npc-dialog-speaker" style={{ color: accentColor }}>{currentDialog.name}</div>
          <div className="npc-dialog-text">
            {displayedText}
            {isTyping && <span className="npc-dialog-cursor" />}
          </div>
          <div className="npc-dialog-actions">
            <span className="npc-dialog-counter">{currentDialogIndex + 1}/{dialogsToShow.length}</span>
            <button className="btn btn-primary npc-dialog-next" onClick={handleNext}>
              {isTyping ? '跳过' : isLast ? '继续探索' : '下一句'}
            </button>
          </div>
        </div>

        {/* 关闭按钮 */}
        <button className="npc-dialog-close" onClick={onClose}>×</button>
      </div>

      <style>{`
        .npc-dialog-overlay {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--text-primary) 60%, transparent);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .npc-dialog-modal {
          position: relative;
          width: 90%;
          max-width: 640px;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-float);
          animation: slideUp 0.3s var(--ease-slide);
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .npc-dialog-loading {
          padding: 40px;
          text-align: center;
          color: var(--text-secondary);
        }
        .npc-dialog-portrait {
          padding: 32px 24px 16px;
          text-align: center;
        }
        .npc-portrait-avatar {
          font-size: 64px;
          width: 96px;
          height: 96px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-muted);
          border: 3px solid;
          border-radius: 50%;
        }
        .npc-portrait-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .npc-portrait-subject {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .npc-dialog-box {
          padding: 16px 24px 20px;
          border-top: 2px solid;
          background: var(--bg-card);
        }
        .npc-dialog-speaker {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .npc-dialog-text {
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-primary);
          min-height: 80px;
          white-space: pre-wrap;
        }
        .npc-dialog-cursor {
          display: inline-block;
          width: 2px;
          height: 16px;
          background: var(--primary);
          margin-left: 2px;
          animation: blink 0.8s steps(2) infinite;
          vertical-align: middle;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .npc-dialog-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 16px;
        }
        .npc-dialog-counter {
          font-size: 12px;
          color: var(--text-tertiary, var(--text-secondary));
        }
        .npc-dialog-next {
          padding: 8px 24px;
          font-size: 14px;
        }
        .npc-dialog-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border: none;
          background: var(--bg-muted);
          color: var(--text-secondary);
          font-size: 20px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .npc-dialog-close:hover {
          background: var(--danger-light);
          color: var(--danger);
        }
      `}</style>
    </div>
  )
}
