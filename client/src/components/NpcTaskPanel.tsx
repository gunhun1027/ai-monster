// NPC任务面板组件 - 显示进行中的任务列表
import { useState, useEffect, useCallback } from 'react'
import { npcApi } from '../services/api'
import type { NpcTask } from '../types'

export default function NpcTaskPanel() {
  const [tasks, setTasks] = useState<NpcTask[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  // 加载所有导师的活跃任务
  const loadTasks = useCallback(async () => {
    try {
      const { mentors } = await npcApi.mentors()
      const details = await Promise.all(mentors.map((m) => npcApi.mentorDetail(m.id)))
      const allTasks: NpcTask[] = details.flatMap((detail) => detail.activeTasks)
      setTasks(allTasks)
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleClaim = async (taskId: string) => {
    setClaimingId(taskId)
    try {
      await npcApi.claimTask(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch (err) {
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return (
      <div className="npc-task-panel">
        <div className="npc-task-header">导师任务</div>
        <div className="npc-task-loading">加载中...</div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="npc-task-panel">
        <div className="npc-task-header">导师任务</div>
        <div className="npc-task-empty">暂无进行中的任务，访问导师可领取每日任务</div>
      </div>
    )
  }

  return (
    <div className="npc-task-panel">
      <div className="npc-task-header">导师任务 ({tasks.length})</div>
      <div className="npc-task-list">
        {tasks.map((task) => {
          const progress = Math.round((task.currentValue / task.targetValue) * 100)
          return (
            <div key={task.id} className={`npc-task-item ${task.isCompleted ? 'completed' : ''}`}>
              <div className="npc-task-title">{task.title}</div>
              <div className="npc-task-desc">{task.description}</div>
              <div className="npc-task-progress">
                <div className="npc-task-progress-bar">
                  <div className="npc-task-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="npc-task-progress-text">{task.currentValue}/{task.targetValue}</span>
              </div>
              <div className="npc-task-reward">
                奖励: {task.rewardCoins}金币 + {task.rewardExp}经验
              </div>
              {task.isCompleted && (
                <button
                  className="btn btn-primary npc-task-claim"
                  onClick={() => handleClaim(task.id)}
                  disabled={claimingId === task.id}
                >
                  {claimingId === task.id ? '领取中...' : '领取奖励'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <style>{`
        .npc-task-panel {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
        }
        .npc-task-header {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
        }
        .npc-task-loading, .npc-task-empty {
          font-size: 13px;
          color: var(--text-secondary);
          text-align: center;
          padding: 16px 0;
        }
        .npc-task-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .npc-task-item {
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--bg-muted);
        }
        .npc-task-item.completed {
          border-color: var(--success);
          background: var(--success-light);
        }
        .npc-task-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .npc-task-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        .npc-task-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .npc-task-progress-bar {
          flex: 1;
          height: 6px;
          background: var(--border);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .npc-task-progress-fill {
          height: 100%;
          background: var(--primary);
          border-radius: var(--radius-full);
          transition: width 0.3s var(--ease-slide);
        }
        .npc-task-item.completed .npc-task-progress-fill {
          background: var(--success);
        }
        .npc-task-progress-text {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
        }
        .npc-task-reward {
          font-size: 12px;
          color: var(--warning, #f59e0b);
          margin-bottom: 8px;
        }
        .npc-task-claim {
          width: 100%;
          padding: 8px;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}
