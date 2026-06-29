// NPC导师卡片组件
import type { NpcMentor } from '../types'

interface NpcMentorCardProps {
  mentor: NpcMentor
  onClick: (mentor: NpcMentor) => void
}

export default function NpcMentorCard({ mentor, onClick }: NpcMentorCardProps) {
  const hasBadge = mentor.unreadCount > 0 || mentor.activeTaskCount > 0
  return (
    <button className="npc-mentor-card" onClick={() => onClick(mentor)}>
      {hasBadge && <span className="npc-badge" />}
      <div className="npc-avatar">{mentor.avatar}</div>
      <div className="npc-info">
        <div className="npc-name">{mentor.name}</div>
        <div className="npc-subject">{mentor.subjectName}</div>
        <div className="npc-personality">{mentor.personality}</div>
        {(mentor.unreadCount > 0 || mentor.activeTaskCount > 0) && (
          <div className="npc-tags">
            {mentor.unreadCount > 0 && <span className="npc-tag npc-tag-dialog">{mentor.unreadCount}条新对话</span>}
            {mentor.activeTaskCount > 0 && <span className="npc-tag npc-tag-task">{mentor.activeTaskCount}个任务</span>}
          </div>
        )}
      </div>
      <style>{`
        .npc-mentor-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          cursor: pointer;
          transition: all 0.25s var(--ease-slide);
          text-align: left;
          width: 100%;
          position: relative;
        }
        .npc-mentor-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }
        .npc-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--danger);
        }
        .npc-avatar {
          font-size: 32px;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-muted);
          border-radius: var(--radius-lg);
          flex-shrink: 0;
        }
        .npc-info {
          flex: 1;
          min-width: 0;
        }
        .npc-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .npc-subject {
          font-size: 12px;
          color: var(--primary);
          margin-bottom: 4px;
        }
        .npc-personality {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .npc-tags {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .npc-tag {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: 500;
        }
        .npc-tag-dialog {
          background: var(--info-light);
          color: var(--info);
        }
        .npc-tag-task {
          background: var(--warning-light);
          color: var(--warning);
        }
      `}</style>
    </button>
  )
}
