// 怪兽展示卡片组件 - 养成互动系统
import { useState, useEffect, useCallback } from 'react'
import type { User } from '../types'
import { monsterApi, branchApi } from '../services/api'
import UserTitleBadge from './UserTitleBadge'

interface MonsterCardProps {
  user: User
  onRename?: () => void
  onUpdate?: (updates: Partial<User>) => void
}

const MONSTER_IMAGES: Record<string, string> = {
  egg: '/assets/monsters/monster-egg.svg',
  slime: '/assets/monsters/monster-slime.svg',
  dragon: '/assets/monsters/monster-dragon.svg',
  fire: '/assets/monsters/monster-fire.svg',
  divine: '/assets/monsters/monster-divine.svg',
}

const STAGE_LABELS: Record<string, string> = {
  egg: '蛋',
  slime: '史莱姆',
  dragon: '幼龙',
  fire: '火龙',
  divine: '神兽',
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  tired: '😴',
  excited: '🤩',
  angry: '😠',
}

const MOOD_LABELS: Record<string, string> = {
  happy: '开心',
  sad: '难过',
  tired: '疲惫',
  excited: '兴奋',
  angry: '生气',
}

const BRANCH_CSS_FILTERS: Record<string, string> = {
  brave: 'hue-rotate(0deg) brightness(1.1)',
  wise: 'hue-rotate(200deg) brightness(1.2)',
  tough: 'hue-rotate(40deg) brightness(0.9)',
}

const BRANCH_NAMES: Record<string, string> = {
  brave: '勇武之路',
  wise: '智慧之路',
  tough: '坚韧之路',
}

const ABILITY_LEVELS = [
  { min: 0, max: 20, label: '新手', color: 'var(--text-muted)' },
  { min: 21, max: 40, label: '入门', color: 'var(--success)' },
  { min: 41, max: 60, label: '进阶', color: 'var(--info)' },
  { min: 61, max: 80, label: '熟练', color: 'var(--primary)' },
  { min: 81, max: 100, label: '大师', color: 'var(--warning)' },
]

export default function MonsterCard({ user, onRename, onUpdate }: MonsterCardProps) {
  const [animating, setAnimating] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [pathPoints, setPathPoints] = useState<{ brave: number; wise: number; tough: number }>({ brave: 0, wise: 0, tough: 0 })

  useEffect(() => {
    branchApi.pathPoints().then(data => {
      setPathPoints({ brave: data.brave, wise: data.wise, tough: data.tough })
    }).catch(() => {})
  }, [])

  const monsterImg = MONSTER_IMAGES[user.monsterStage] || MONSTER_IMAGES.egg
  const stageLabel = STAGE_LABELS[user.monsterStage] || '蛋'
  const branchFilter = user.evolutionBranch ? BRANCH_CSS_FILTERS[user.evolutionBranch] || '' : ''
  const expPercent = user.monsterMaxExp > 0 ? (user.monsterExp / user.monsterMaxExp) * 100 : 0
  const accuracy = user.totalQuiz > 0 ? Math.round((user.totalCorrect / user.totalQuiz) * 100) : 0
  const moodEmoji = MOOD_EMOJI[user.monsterMood] || '😊'
  const moodLabel = MOOD_LABELS[user.monsterMood] || '开心'

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }, [])

  const triggerAnimation = useCallback((type: string) => {
    setAnimating(type)
    setTimeout(() => setAnimating(null), 500)
  }, [])

  const handleFeed = async (itemType: 'apple' | 'fish' | 'cake') => {
    if (loading) return
    setLoading('feed')
    try {
      const result = await monsterApi.feed(itemType)
      onUpdate?.({
        hunger: result.hunger,
        happiness: result.happiness,
        coins: result.coins,
        monsterMood: result.mood,
      })
      showToast(result.message)
      triggerAnimation('bounce')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '喂食失败')
    } finally {
      setLoading(null)
    }
  }

  const handlePlay = async () => {
    if (loading) return
    setLoading('play')
    try {
      const result = await monsterApi.play()
      onUpdate?.({
        happiness: result.happiness,
        monsterMood: result.mood,
      })
      showToast(result.message)
      triggerAnimation('shake')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '玩耍失败')
    } finally {
      setLoading(null)
    }
  }

  const handleClean = async () => {
    if (loading) return
    setLoading('clean')
    try {
      const result = await monsterApi.clean()
      onUpdate?.({
        cleanliness: 100,
        monsterMood: result.mood,
      })
      showToast(result.message)
      triggerAnimation('bounce')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '清洁失败')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="card monster-card">
      {/* 金币 */}
      <div className="monster-coins">
        <span className="coins-icon">💰</span>
        <span className="coins-value">{user.coins}</span>
      </div>

      {/* 怪兽图片 */}
      <div className={`monster-image-wrap ${animating ? 'anim-' + animating : ''}`}>
        <img src={monsterImg} alt={user.monsterName} className="monster-image" style={branchFilter ? { filter: branchFilter } : undefined} />
      </div>

      {/* 心情表情 */}
      <div className="monster-mood">
        <span className="mood-emoji">{moodEmoji}</span>
        <span className="mood-label">{moodLabel}</span>
      </div>

      {/* 名字 */}
      <div className="monster-name-row">
        {onRename ? (
          <button className="monster-name-btn" onClick={onRename}>
            {user.monsterName}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        ) : (
          <h2 className="monster-name">{user.monsterName}</h2>
        )}
      </div>

      {/* 等级 + 阶段 */}
      <div className="monster-stage">
        <span className="badge badge-primary">Lv.{user.monsterLevel}</span>
        <span className="stage-text">{stageLabel}</span>
        {/* 剧情系统 v2：称号徽章 */}
        {user.title && (
          <UserTitleBadge
            title={user.title}
            onTitleChange={(newTitle) => onUpdate?.({ title: newTitle })}
          />
        )}
      </div>

      {/* 经验进度 */}
      <div className="monster-exp">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${expPercent}%` }} />
        </div>
        <div className="exp-text">{user.monsterExp}/{user.monsterMaxExp} EXP</div>
      </div>

      {/* 养成属性条 */}
      <div className="monster-attributes">
        <div className="attr-row">
          <span className="attr-label">饥饿度</span>
          <div className="progress-bar attr-hunger-bar">
            <div className="progress-fill attr-hunger-fill" style={{ width: `${user.hunger}%` }} />
          </div>
          <span className="attr-value">{user.hunger}</span>
        </div>
        <div className="attr-row">
          <span className="attr-label">清洁度</span>
          <div className="progress-bar attr-clean-bar">
            <div className="progress-fill attr-clean-fill" style={{ width: `${user.cleanliness}%` }} />
          </div>
          <span className="attr-value">{user.cleanliness}</span>
        </div>
        <div className="attr-row">
          <span className="attr-label">快乐度</span>
          <div className="progress-bar attr-happy-bar">
            <div className="progress-fill attr-happy-fill" style={{ width: `${user.happiness}%` }} />
          </div>
          <span className="attr-value">{user.happiness}</span>
        </div>
      </div>

      {/* 互动按钮 */}
      <div className="monster-actions">
        <button className="action-btn action-feed" onClick={() => handleFeed('apple')} disabled={loading === 'feed'}>
          <span className="action-icon">🍎</span>
          <span className="action-text">喂食</span>
        </button>
        <button className="action-btn action-play" onClick={handlePlay} disabled={loading === 'play'}>
          <span className="action-icon">🎾</span>
          <span className="action-text">玩耍</span>
        </button>
        <button className="action-btn action-clean" onClick={handleClean} disabled={loading === 'clean'}>
          <span className="action-icon">🧼</span>
          <span className="action-text">清洁</span>
        </button>
      </div>

      {/* 统计 */}
      <div className="monster-stats">
        <div className="stat-item">
          <span className="stat-value">{user.streakDays}</span>
          <span className="stat-label">连胜天数</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{user.totalQuiz}</span>
          <span className="stat-label">总答题</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{accuracy}%</span>
          <span className="stat-label">正确率</span>
        </div>
      </div>

      {/* 进化分支 */}
      {user.evolutionBranch && (
        <div className="monster-branch">
          <span className="branch-badge" style={{ background: user.evolutionBranch === 'brave' ? 'var(--danger)' : user.evolutionBranch === 'wise' ? 'var(--info)' : 'var(--warning)', color: 'var(--text-on-primary)', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600 }}>
            {BRANCH_NAMES[user.evolutionBranch] || user.evolutionBranch}
          </span>
        </div>
      )}

      {/* 倾向点数 */}
      {(pathPoints.brave > 0 || pathPoints.wise > 0 || pathPoints.tough > 0) && (
        <div className="monster-path-points">
          <div className="path-row">
            <span style={{ color: 'var(--danger)' }}>⚔️ 勇武</span>
            <div className="progress-bar" style={{ flex: 1, height: 4 }}>
              <div className="progress-fill" style={{ width: `${Math.min(100, pathPoints.brave)}%`, background: 'var(--danger)' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pathPoints.brave}</span>
          </div>
          <div className="path-row">
            <span style={{ color: 'var(--info)' }}>📖 智慧</span>
            <div className="progress-bar" style={{ flex: 1, height: 4 }}>
              <div className="progress-fill" style={{ width: `${Math.min(100, pathPoints.wise)}%`, background: 'var(--info)' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pathPoints.wise}</span>
          </div>
          <div className="path-row">
            <span style={{ color: 'var(--warning)' }}>🛡️ 坚韧</span>
            <div className="progress-bar" style={{ flex: 1, height: 4 }}>
              <div className="progress-fill" style={{ width: `${Math.min(100, pathPoints.tough)}%`, background: 'var(--warning)' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pathPoints.tough}</span>
          </div>
        </div>
      )}

      {/* 能力值 */}
      {user.abilityScore !== undefined && (
        <div className="monster-ability">
          <div className="ability-header">
            <span className="ability-label">能力值</span>
            <span className="ability-level" style={{ color: ABILITY_LEVELS.find(l => user.abilityScore! >= l.min && user.abilityScore! <= l.max)?.color }}>
              {ABILITY_LEVELS.find(l => user.abilityScore! >= l.min && user.abilityScore! <= l.max)?.label || '新手'}
            </span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{
              width: `${user.abilityScore}%`,
              background: ABILITY_LEVELS.find(l => user.abilityScore! >= l.min && user.abilityScore! <= l.max)?.color || 'var(--text-muted)'
            }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(user.abilityScore)}/100</span>
        </div>
      )}

      {/* Toast提示 */}
      {toastMsg && <div className="monster-toast">{toastMsg}</div>}

      <style>{`
        .monster-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          position: relative;
        }
        .monster-coins {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: var(--warning-light);
          border-radius: var(--radius-full);
          font-size: 14px;
          font-weight: 600;
          color: var(--warning-text);
        }
        .coins-icon { font-size: 16px; }
        .coins-value { font-variant-numeric: tabular-nums; }
        .monster-image-wrap {
          display: flex;
          justify-content: center;
          transition: transform 0.3s var(--ease-spring);
        }
        .monster-image-wrap.anim-bounce {
          animation: monster-bounce 0.5s var(--ease-spring);
        }
        .monster-image-wrap.anim-shake {
          animation: monster-shake 0.5s var(--ease-spring);
        }
        @keyframes monster-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes monster-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .monster-image {
          width: 150px;
          height: auto;
        }
        .monster-mood {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mood-emoji { font-size: 24px; }
        .mood-label { font-size: 13px; color: var(--text-secondary); }
        .monster-name-row {
          display: flex;
          align-items: center;
        }
        .monster-name {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .monster-name-btn {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          background: transparent;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          transition: background 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .monster-name-btn:hover {
          background: var(--bg-hover);
        }
        .monster-name-btn svg {
          color: var(--text-muted);
        }
        .monster-stage {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .stage-text {
          font-size: 14px;
          color: var(--text-secondary);
        }
        .monster-exp {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .exp-text {
          font-size: 12px;
          color: var(--text-muted);
          text-align: right;
        }
        .monster-attributes {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .attr-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .attr-label {
          font-size: 12px;
          color: var(--text-secondary);
          width: 44px;
          text-align: right;
          flex-shrink: 0;
        }
        .attr-value {
          font-size: 12px;
          color: var(--text-muted);
          width: 28px;
          text-align: left;
          flex-shrink: 0;
        }
        .attr-hunger-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-muted);
        }
        .attr-hunger-fill {
          background: linear-gradient(90deg, var(--warning), color-mix(in srgb, var(--warning) 70%, transparent));
        }
        .attr-clean-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-muted);
        }
        .attr-clean-fill {
          background: linear-gradient(90deg, var(--info), color-mix(in srgb, var(--info) 70%, transparent));
        }
        .attr-happy-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-muted);
        }
        .attr-happy-fill {
          background: linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 70%, transparent));
        }
        .monster-actions {
          display: flex;
          gap: 8px;
          width: 100%;
        }
        .action-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 4px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--bg-card);
          transition: all 0.2s var(--ease-slide);
          cursor: pointer;
        }
        .action-btn:hover:not(:disabled) {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-icon { font-size: 18px; }
        .action-text { font-size: 12px; color: var(--text-secondary); }
        .monster-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding-top: 8px;
          width: 100%;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .stat-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .monster-toast {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary);
          color: var(--text-on-primary);
          padding: 6px 16px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          box-shadow: var(--shadow);
          animation: toast-in 0.3s var(--ease-spring);
          z-index: 10;
        }
        @keyframes toast-in {
          0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .monster-branch { margin-top: 4px; }
        .monster-path-points {
          width: 100%;
          display: flex; flex-direction: column; gap: 4px;
          padding-top: 8px; border-top: 1px solid var(--border);
        }
        .path-row {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px;
        }
        .monster-ability {
          width: 100%;
          display: flex; flex-direction: column; gap: 2px;
        }
        .ability-header {
          display: flex; justify-content: space-between; align-items: center;
        }
        .ability-label { font-size: 12px; color: var(--text-secondary); }
        .ability-level { font-size: 13px; font-weight: 600; }
      `}</style>
    </div>
  )
}