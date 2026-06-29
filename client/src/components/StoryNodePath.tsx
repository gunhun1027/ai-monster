// 故事节点路径组件 - 闯关地图样式
import type { StoryNodeInfo } from '../types'

interface StoryNodePathProps {
  nodes: StoryNodeInfo[]
  themeColor: string
  userStars: number
  onSelectNode: (node: StoryNodeInfo) => void
}

export default function StoryNodePath({ nodes, themeColor, userStars, onSelectNode }: StoryNodePathProps) {
  return (
    <div className="story-node-path">
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1
        const state = !node.isUnlocked ? 'locked' : node.isCompleted ? 'completed' : 'current'
        return (
          <div key={node.id} className="node-row">
            <button
              className={`story-node story-node-${state} ${node.isBoss ? 'story-node-boss' : ''}`}
              onClick={() => node.isUnlocked && onSelectNode(node)}
              disabled={!node.isUnlocked}
              style={{
                ['--node-color' as string]: node.isBoss ? 'var(--danger)' : themeColor,
              }}
            >
              <div className="node-index">{node.isBoss ? '👑' : index + 1}</div>
              <div className="node-info">
                <div className="node-name">{node.name}</div>
                <div className="node-desc">{node.description}</div>
                <div className="node-meta">
                  <span className="node-meta-item">难度 {'⭐'.repeat(node.difficulty)}</span>
                  <span className="node-meta-item">{node.questionCount}题</span>
                  <span className="node-meta-item reward">奖励 {node.rewardStars}⭐</span>
                </div>
                {node.requiredStars > 0 && (
                  <div className="node-require">需要 {node.requiredStars}⭐ 解锁</div>
                )}
              </div>
              <div className="node-status-icon">
                {state === 'locked' && '🔒'}
                {state === 'completed' && '✓'}
                {state === 'current' && '▶'}
              </div>
            </button>
            {!isLast && <div className={`node-connector connector-${state}`} />}
          </div>
        )
      })}

      <style>{`
        .story-node-path {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 16px 0;
        }
        .node-row {
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        .story-node {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          cursor: pointer;
          transition: all 0.25s var(--ease-slide);
          text-align: left;
          width: 100%;
          position: relative;
        }
        .story-node:hover:not(:disabled) {
          border-color: var(--node-color, var(--primary));
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }
        .story-node:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .story-node-completed {
          border-color: var(--success);
          background: var(--success-light);
        }
        .story-node-current {
          border-color: var(--node-color, var(--primary));
          background: var(--primary-light);
          animation: nodePulse 2s ease-in-out infinite;
        }
        .story-node-boss {
          border-color: var(--danger);
        }
        .story-node-boss.story-node-current {
          background: var(--danger-light);
        }
        @keyframes nodePulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 20%, transparent); }
          50% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--primary) 0%, transparent); }
        }
        .node-index {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--node-color, var(--primary));
          color: var(--text-on-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .node-info {
          flex: 1;
          min-width: 0;
        }
        .node-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .node-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .node-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 12px;
          color: var(--text-tertiary, var(--text-secondary));
        }
        .node-meta-item.reward {
          color: var(--warning);
          font-weight: 600;
        }
        .node-require {
          font-size: 12px;
          color: var(--text-tertiary, var(--text-secondary));
          margin-top: 4px;
        }
        .node-status-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        .node-connector {
          width: 2px;
          height: 24px;
          background: var(--border);
          margin-left: 39px;
          align-self: flex-start;
        }
        .node-connector.connector-completed {
          background: var(--success);
        }
        .node-connector.connector-current {
          background: var(--node-color, var(--primary));
        }
      `}</style>
    </div>
  )
}
