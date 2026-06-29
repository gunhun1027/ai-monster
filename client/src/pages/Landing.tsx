// 介绍页 - 未登录可访问
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import type { ThemeMode } from '../hooks/useTheme'

const THEME_OPTIONS: { mode: ThemeMode; icon: JSX.Element; label: string }[] = [
  {
    mode: 'light',
    label: '浅色模式',
    icon: (
      <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <line x1="7" y1="1.5" x2="7" y2="3"/>
          <line x1="7" y1="11" x2="7" y2="12.5"/>
          <line x1="1.5" y1="7" x2="3" y2="7"/>
          <line x1="11" y1="7" x2="12.5" y2="7"/>
          <line x1="3.05" y1="3.05" x2="4.1" y2="4.1"/>
          <line x1="9.9" y1="9.9" x2="10.95" y2="10.95"/>
          <line x1="3.05" y1="10.95" x2="4.1" y2="9.9"/>
          <line x1="9.9" y1="4.1" x2="10.95" y2="3.05"/>
        </g>
      </svg>
    ),
  },
  {
    mode: 'dark',
    label: '深色模式',
    icon: (
      <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
        <path d="M11.5 8.5C10.8 8.8 10 9 9.2 9C6.6 9 4.5 6.9 4.5 4.3C4.5 3.5 4.7 2.7 5 2C3.2 2.5 2 4.1 2 6C2 8.5 4 10.5 6.5 10.5C8.4 10.5 10 9.4 11.5 8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    mode: 'system',
    label: '跟随系统',
    icon: (
      <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M1.5 7H12.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M7 7V12.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1"/>
        <path d="M1.5 7V5C1.5 3.067 3.067 1.5 5 1.5H7" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
]

const FEATURES = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" stroke="var(--primary)" strokeWidth="2"/>
        <circle cx="12" cy="13" r="2" fill="var(--primary)"/>
        <circle cx="20" cy="13" r="2" fill="var(--primary)"/>
        <path d="M10 20c1.5 2 3.5 3 6 3s4.5-1 6-3" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: '养成互动',
    desc: '喂养、玩耍、清洁你的专属怪兽，看它成长进化',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 8h20v16H6z" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M6 8l10 8 10-8" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
    title: '多学科答题',
    desc: '覆盖数学、语文、英语、科学，AI智能出题挑战',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 4l3.5 7 7.5 1.1-5.5 5.3 1.3 7.6L16 21l-6.8 3.6 1.3-7.6L5 12.1l7.5-1.1L16 4z" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
    title: '进化成长',
    desc: '从神秘蛋到神兽，5个进化阶段等你解锁',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="6" width="20" height="20" rx="4" stroke="var(--primary)" strokeWidth="2"/>
        <path d="M6 14h20" stroke="var(--primary)" strokeWidth="2"/>
        <path d="M14 14v12" stroke="var(--primary)" strokeWidth="2"/>
        <circle cx="22" cy="22" r="2" fill="var(--primary)"/>
      </svg>
    ),
    title: '每日签到',
    desc: '7天循环奖励，金币宝箱掉落，惊喜不断',
  },
]

const STAGES = [
  { name: '神秘蛋', file: 'monster-egg.svg', desc: '初始形态' },
  { name: '史莱姆', file: 'monster-slime.svg', desc: 'Lv.5' },
  { name: '幼龙', file: 'monster-dragon.svg', desc: 'Lv.15' },
  { name: '火龙', file: 'monster-fire.svg', desc: 'Lv.30' },
  { name: '神兽', file: 'monster-divine.svg', desc: 'Lv.50' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { mode, setMode } = useTheme()
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const themeWrapRef = useRef<HTMLDivElement>(null)

  const currentThemeOption = THEME_OPTIONS.find(o => o.mode === mode) || THEME_OPTIONS[2]

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showThemeDropdown && themeWrapRef.current && !themeWrapRef.current.contains(e.target as Node)) {
        setShowThemeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showThemeDropdown])

  return (
    <div className="landing">
      {/* 顶部栏 */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/assets/logo/logo-256.svg" alt="Logo" style={{ height: '28px' }} />
            <span className="landing-logo-text">AI出题怪兽</span>
          </div>
          <div className="landing-nav-actions">
            <div className="theme-dropdown-wrap" ref={themeWrapRef}>
              <button
                className="theme-trigger"
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                title={currentThemeOption.label}
              >
                <span className="theme-trigger-icon">{currentThemeOption.icon}</span>
                <span className="theme-trigger-label">{currentThemeOption.label}</span>
                <svg className="theme-trigger-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className={'theme-dropdown' + (showThemeDropdown ? ' visible' : '')}>
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    className={'theme-dropdown-item' + (mode === opt.mode ? ' active' : '')}
                    onClick={() => { setMode(opt.mode); setShowThemeDropdown(false) }}
                  >
                    <span className="theme-dropdown-icon">{opt.icon}</span>
                    <span className="theme-dropdown-label">{opt.label}</span>
                    {mode === opt.mode && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="theme-check">
                        <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-secondary landing-btn-login" onClick={() => navigate('/login')}>
              登录
            </button>
            <button className="btn btn-primary landing-btn-signup" onClick={() => navigate('/login?tab=register')}>
              免费注册
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="hero-content">
            <h1 className="hero-title">答题闯关<br/>养成你的专属怪兽</h1>
            <p className="hero-desc">
              AI智能出题，覆盖多学科知识。喂养、玩耍、进化你的怪兽，
              每日签到赢取金币宝箱，让学习变成一场冒险。
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary hero-start" onClick={() => navigate('/login?tab=register')}>
              开始冒险
            </button>
            </div>
          </div>
          <div className="hero-monster">
            <img src="/assets/monsters/monster-divine.svg" alt="神兽" className="hero-monster-img" />
            <div className="hero-monster-glow" />
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section id="features" className="landing-section">
        <div className="section-inner">
          <h2 className="section-title">核心玩法</h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 进化链 */}
      <section className="landing-section section-alt">
        <div className="section-inner">
          <h2 className="section-title">5阶段进化</h2>
          <p className="section-subtitle">从一颗神秘蛋开始，让你的怪兽不断成长</p>
          <div className="stages-row">
            {STAGES.map((s, i) => (
              <div key={i} className="stage-item">
                <div className="stage-img-wrap">
                  <img src={`/assets/monsters/${s.file}`} alt={s.name} className="stage-img" />
                </div>
                <div className="stage-name">{s.name}</div>
                <div className="stage-desc">{s.desc}</div>
                {i < STAGES.length - 1 && <div className="stage-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section landing-cta">
        <div className="section-inner cta-inner">
          <h2 className="cta-title">准备好了吗？</h2>
          <p className="cta-desc">注册即可免费开始，和你的怪兽一起成长</p>
          <button className="btn btn-primary cta-btn" onClick={() => navigate('/login?tab=register')}>
            立即开始
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <span>AI出题怪兽 - TRAE AI 创造力大赛参赛作品</span>
        </div>
      </footer>

      <style>{`
        .landing {
          min-height: 100vh;
          background: var(--bg-main);
          color: var(--text-primary);
          transition: background 0.3s, color 0.3s;
        }

        /* Nav */
        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(12px);
          transition: background 0.3s, border-color 0.3s;
        }
        .landing-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .landing-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .landing-logo-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          transition: color 0.3s;
        }
        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        /* 主题下拉切换 */
        .theme-dropdown-wrap {
          position: relative;
        }
        .theme-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 34px;
          padding: 0 12px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
          background: var(--bg-muted);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
        }
        .theme-trigger:hover {
          border-color: var(--primary);
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .theme-trigger-icon {
          display: flex;
          align-items: center;
        }
        .theme-trigger-label {
          font-weight: 500;
          white-space: nowrap;
        }
        .theme-trigger-arrow {
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .theme-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 180px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-float);
          z-index: 300;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-8px) scale(0.96);
          transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
          padding: 6px;
        }
        .theme-dropdown.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }
        .theme-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 14px;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .theme-dropdown-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .theme-dropdown-item.active {
          color: var(--primary);
          background: var(--primary-light);
          font-weight: 600;
        }
        .theme-dropdown-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .theme-dropdown-label {
          flex: 1;
          white-space: nowrap;
        }
        .theme-check {
          flex-shrink: 0;
          color: var(--primary);
        }
        .landing-btn-login, .landing-btn-signup {
          padding: 6px 16px;
          font-size: 13px;
          border-radius: var(--radius-full);
        }

        /* Hero */
        .landing-hero {
          padding: 80px 24px 60px;
        }
        .landing-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .hero-title {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--text-primary);
          margin-bottom: 16px;
          transition: color 0.3s;
        }
        .hero-desc {
          font-size: 17px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 32px;
          transition: color 0.3s;
        }
        .hero-actions {
          display: flex;
          gap: 12px;
        }
        .hero-start, .hero-learn {
          padding: 12px 28px;
          font-size: 15px;
          border-radius: var(--radius-full);
        }
        .hero-monster {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .hero-monster-img {
          width: 300px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 8px 24px color-mix(in srgb, var(--primary) 20%, transparent));
          animation: float 4s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .hero-monster-glow {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: var(--primary);
          opacity: 0.08;
          filter: blur(60px);
          bottom: -20px;
        }

        /* Sections */
        .landing-section {
          padding: 80px 24px;
        }
        .section-alt {
          background: var(--bg-muted);
          transition: background 0.3s;
        }
        .section-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-title {
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 12px;
          color: var(--text-primary);
          transition: color 0.3s;
        }
        .section-subtitle {
          text-align: center;
          font-size: 15px;
          color: var(--text-secondary);
          margin-bottom: 48px;
          transition: color 0.3s;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 40px;
        }
        .feature-card {
          text-align: center;
          padding: 28px 20px;
          transition: transform 0.2s var(--ease-slide), border-color 0.2s;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
        }
        .feature-icon {
          margin-bottom: 16px;
          display: flex;
          justify-content: center;
        }
        .feature-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-primary);
          transition: color 0.3s;
        }
        .feature-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          transition: color 0.3s;
        }

        /* Stages */
        .stages-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-top: 40px;
          flex-wrap: wrap;
        }
        .stage-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
          padding: 0 12px;
        }
        .stage-img-wrap {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 8px;
          transition: border-color 0.2s, transform 0.2s var(--ease-slide), background 0.3s;
        }
        .stage-item:hover .stage-img-wrap {
          border-color: var(--primary);
          transform: scale(1.08);
        }
        .stage-img {
          width: 56px;
          height: auto;
        }
        .stage-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          transition: color 0.3s;
        }
        .stage-desc {
          font-size: 12px;
          color: var(--text-muted);
        }
        .stage-arrow {
          position: absolute;
          right: -8px;
          top: 32px;
          color: var(--primary);
          font-size: 18px;
          font-weight: 700;
        }

        /* CTA */
        .landing-cta {
          text-align: center;
        }
        .cta-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .cta-title {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          transition: color 0.3s;
        }
        .cta-desc {
          font-size: 16px;
          color: var(--text-secondary);
          transition: color 0.3s;
        }
        .cta-btn {
          padding: 14px 40px;
          font-size: 16px;
          border-radius: var(--radius-full);
          margin-top: 8px;
        }

        /* Footer */
        .landing-footer {
          padding: 24px;
          border-top: 1px solid var(--border);
          text-align: center;
          transition: border-color 0.3s;
        }
        .footer-inner {
          font-size: 13px;
          color: var(--text-muted);
        }

        @media (max-width: 900px) {
          .landing-hero-inner {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-title { font-size: 32px; }
          .hero-actions { justify-content: center; }
          .hero-monster { order: -1; }
          .hero-monster-img { width: 200px; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .stage-arrow { display: none; }
          .stages-row { gap: 12px; }
        }
        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr; }
          .hero-title { font-size: 28px; }
          .landing-btn-login { display: none; }
          .theme-trigger-label { display: none; }
          .theme-trigger { padding: 0 8px; }
        }
      `}</style>
    </div>
  )
}
