// 挑战模式页面 - 速答、Boss、生存模式
import { useState, useEffect, useCallback } from 'react'
import { challengeApi, subjectApi } from '../services/api'
import ChallengeGame from '../components/ChallengeGame'
import type { ChallengeConfig, Subject } from '../types'

export default function Challenges() {
  const [challenges, setChallenges] = useState<ChallengeConfig[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [activeChallenge, setActiveChallenge] = useState<ChallengeConfig | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>()

  const fetchData = useCallback(async () => {
    try {
      const [chalData, subData] = await Promise.all([
        challengeApi.list(),
        subjectApi.list(),
      ])
      setChallenges(chalData.data.challenges)
      setSubjects(subData.subjects)
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStartChallenge = (challenge: ChallengeConfig) => {
    setActiveChallenge(challenge)
  }

  const handleEndChallenge = () => {
    setActiveChallenge(null)
  }

  const themeColors: Record<string, string> = {
    speed: 'var(--danger)',
    boss: 'var(--primary)',
    survival: 'var(--success)',
  }

  if (loading) return <div className="page-loader"><div className="loading-spinner"></div></div>

  if (activeChallenge) {
    return <ChallengeGame config={activeChallenge} subjectId={selectedSubject} onEnd={handleEndChallenge} />
  }

  return (
    <div className="challenges-page">
      <h1 className="challenges-title">挑战模式</h1>

      <div className="subject-filter">
        <button
          className={`filter-btn ${!selectedSubject ? 'active' : ''}`}
          onClick={() => setSelectedSubject(undefined)}
        >
          全部学科
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            className={`filter-btn ${selectedSubject === s.id ? 'active' : ''}`}
            onClick={() => setSelectedSubject(s.id)}
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      <div className="challenge-cards">
        {challenges.map(ch => (
          <div key={ch.id} className="card challenge-card" style={{ borderColor: themeColors[ch.type] || 'var(--border)' }}>
            <div className="challenge-icon" style={{ background: themeColors[ch.type] || 'var(--primary)' }}>
              {ch.icon}
            </div>
            <h3 className="challenge-name">{ch.name}</h3>
            <p className="challenge-desc">{ch.description}</p>
            <div className="challenge-rewards">
              <span>💰 {ch.rewardCoins}</span>
              <span>✨ {ch.rewardExp} EXP</span>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleStartChallenge(ch)}
              style={{ background: themeColors[ch.type] || 'var(--primary)' }}
            >
              开始挑战
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .challenges-page { max-width: 900px; margin: 0 auto; }
        .challenges-title {
          font-size: 22px; font-weight: 700; color: var(--text-primary);
          margin-bottom: 16px;
        }
        .subject-filter {
          display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .filter-btn {
          padding: 6px 14px; border-radius: var(--radius-full);
          font-size: 13px; font-weight: 500;
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
        }
        .filter-btn.active {
          background: var(--primary); color: var(--text-on-primary);
          border-color: var(--primary);
        }
        .challenge-cards {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;
        }
        .challenge-card {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 24px 16px; text-align: center; border-width: 2px;
        }
        .challenge-icon {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; color: white;
        }
        .challenge-name { font-size: 18px; font-weight: 600; color: var(--text-primary); }
        .challenge-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
        .challenge-rewards {
          display: flex; gap: 12px; font-size: 14px; font-weight: 500; color: var(--warning);
        }
      `}</style>
    </div>
  )
}
