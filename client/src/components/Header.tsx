import { useRef, useEffect, useState, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import type { ThemeMode } from '../hooks/useTheme'

const NAV_ITEMS = [
  { path: '/dashboard', label: '仪表盘', end: true },
  { path: '/story', label: '知识大陆', end: false },
  { path: '/cards', label: '卡片图鉴', end: false },
  { path: '/groups', label: '学习小组', end: false },
  { path: '/wrong-answers', label: '错题本', end: false },
  { path: '/analytics', label: '学习报告', end: false },
  { path: '/challenges', label: '挑战', end: false },
  { path: '/shop', label: '商店', end: false },
  { path: '/ranking', label: '排行榜', end: false },
  { path: '/profile', label: '个人中心', end: false },
]

const THEME_OPTIONS: { mode: ThemeMode; icon: JSX.Element; label: string }[] = [
  {
    mode: 'light',
    label: '浅色模式',
    icon: (
      <svg viewBox="0 0 14 14" fill="none">
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
      <svg viewBox="0 0 14 14" fill="none">
        <path d="M11.5 8.5C10.8 8.8 10 9 9.2 9C6.6 9 4.5 6.9 4.5 4.3C4.5 3.5 4.7 2.7 5 2C3.2 2.5 2 4.1 2 6C2 8.5 4 10.5 6.5 10.5C8.4 10.5 10 9.4 11.5 8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    mode: 'system',
    label: '跟随系统',
    icon: (
      <svg viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M1.5 7H12.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M7 7V12.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1"/>
        <path d="M1.5 7V5C1.5 3.067 3.067 1.5 5 1.5H7" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
]

// 鼠标拖动滚动 Hook
function useDragScroll(ref: React.RefObject<HTMLElement>) {
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const hasMoved = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true
      hasMoved.current = false
      startX.current = e.pageX - el.offsetLeft
      scrollLeft.current = el.scrollLeft
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      const walk = x - startX.current
      if (Math.abs(walk) > 3) hasMoved.current = true
      el.scrollLeft = scrollLeft.current - walk
    }
    const onMouseUp = () => {
      isDragging.current = false
      el.style.cursor = ''
      el.style.userSelect = ''
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [ref])

  return hasMoved
}

export default function Header() {
  const { user, logout } = useAuth()
  const { mode, setMode } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const headerRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [headerWidth, setHeaderWidth] = useState(1200)

  // 鼠标拖动滚动导航栏
  const hasMoved = useDragScroll(navRef)

  const allNavItems = user?.role === 'admin'
    ? [...NAV_ITEMS, { path: '/admin', label: '管理', end: false }]
    : NAV_ITEMS

  const currentThemeOption = THEME_OPTIONS.find(o => o.mode === mode) || THEME_OPTIONS[2]

  // 监听 header 宽度变化，用于主题图标自适应
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 主题图标大小根据可用空间自适应
  const themeIconSize = headerWidth > 1100 ? 16 : headerWidth > 900 ? 14 : 12

  // 滚动变形效果 — 苹果液态玻璃风格
  useEffect(() => {
    let ticking = false
    const updateScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY
          const p = Math.min(1, Math.max(0, (y - 10) / 80))
          setScrolled(p > 0.1)
          if (headerRef.current) {
            const el = headerRef.current
            // 液态玻璃：极低透明度背景 + 强模糊 + 饱和度增强
            const bgAlpha = 0.05 * p
            const bgColor = `color-mix(in srgb, var(--bg-card) ${Math.round(bgAlpha * 100)}%, transparent)`
            el.style.setProperty('--h-bg', p > 0.01 ? bgColor : 'var(--bg-card)')
            // 玻璃边框：半透明细线，跟随主题
            const borderAlpha = 0.06 * p
            const borderColor = `color-mix(in srgb, var(--text-primary) ${Math.round(borderAlpha * 100)}%, transparent)`
            el.style.setProperty('--h-border', p > 0.01 ? borderColor : 'var(--border)')
            el.style.setProperty('--h-radius', `calc(var(--radius-full) * ${p})`)
            el.style.setProperty('--h-shadow', p > 0.1 ? 'var(--shadow-float)' : 'none')
            el.style.setProperty('--h-maxw', `calc(100% - ${32 * p}px)`)
            el.style.setProperty('--h-top', `${12 * p}px`)
            el.style.setProperty('--h-pad-y', `${6 * p}px`)
            // 液态玻璃核心：强模糊 + 高饱和度 + 亮度微调
            el.style.setProperty('--h-backdrop', p > 0.1 ? 'blur(50px) saturate(2) brightness(1.08)' : 'none')
            // 内发光效果
            const insetAlpha = 0.15 * p
            el.style.setProperty('--h-inset-shadow', p > 0.1
              ? `inset 0 0.5px 0 color-mix(in srgb, var(--text-primary) ${Math.round(insetAlpha * 100)}%, transparent)`
              : 'none')
          }
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', updateScroll, { passive: true })
    updateScroll()
    return () => window.removeEventListener('scroll', updateScroll)
  }, [])

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showThemeDropdown || showUserDropdown) {
        const target = e.target as HTMLElement
        if (!target.closest('.theme-dropdown-wrap') && !target.closest('.header-user')) {
          setShowThemeDropdown(false)
          setShowUserDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showThemeDropdown, showUserDropdown])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (hasMoved.current) {
      e.preventDefault()
      return
    }
    navigate(path)
  }

  const handleThemeSelect = (selectedMode: ThemeMode) => {
    setMode(selectedMode)
    setShowThemeDropdown(false)
  }

  return (
    <header className="app-header" ref={headerRef}>
      <div className="header-logo" onClick={() => navigate('/dashboard')}>
        <img src="/assets/logo/logo-256.svg" alt="Logo" style={{ height: '28px' }} />
        <span className="header-title">AI出题怪兽</span>
      </div>

      <div className="header-center">
        <div className="header-nav-wrap" ref={navRef}>
          {allNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              onClick={(e) => handleNavClick(e, item.path)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="header-right">
        {/* 主题切换 - 下拉式 */}
        <div className="theme-dropdown-wrap">
          <button
            className="theme-trigger"
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            title={currentThemeOption.label}
          >
            <span className="theme-trigger-icon" style={{ width: themeIconSize, height: themeIconSize }}>
              {currentThemeOption.icon}
            </span>
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
                onClick={() => handleThemeSelect(opt.mode)}
              >
                <span className="theme-dropdown-icon" style={{ width: themeIconSize, height: themeIconSize }}>
                  {opt.icon}
                </span>
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

        {/* 用户下拉 */}
        <div
          className="header-user"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => setShowUserDropdown(true)}
          onMouseLeave={() => setShowUserDropdown(false)}
        >
          <div className="user-avatar-text">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="user-name">{user?.username}</span>
          <div className={'user-dropdown' + (showUserDropdown ? ' visible' : '')}>
            <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
              退出登录
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .header-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .header-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          transition: color 0.3s, opacity 0.3s, transform 0.3s;
          white-space: nowrap;
        }
        .header-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          transition: transform 0.3s var(--ease-slide);
          max-width: calc(100% - 400px);
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .header-nav-wrap {
          display: flex;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          cursor: grab;
          gap: 4px;
          padding: 4px;
          border-radius: var(--radius-full);
          background: var(--bg-muted);
        }
        .header-nav-wrap::-webkit-scrollbar {
          display: none;
        }
        .header-nav-wrap:active {
          cursor: grabbing;
        }
        .nav-link {
          position: relative;
          z-index: 1;
          font-weight: 500;
          font-size: 14px;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          flex: none;
          white-space: nowrap;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.2s, background 0.2s;
        }
        .nav-link:hover {
          color: var(--text-primary);
        }
        .nav-link.active {
          color: var(--text-on-primary);
          background: var(--primary);
        }

        /* 主题下拉 */
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
          justify-content: center;
          flex-shrink: 0;
          transition: width 0.2s, height 0.2s;
        }
        .theme-trigger-icon svg {
          width: 100%;
          height: 100%;
        }
        .theme-trigger-label {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          transition: max-width 0.3s, opacity 0.2s;
          max-width: 80px;
          opacity: 1;
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
          justify-content: center;
          flex-shrink: 0;
          transition: width 0.2s, height 0.2s;
        }
        .theme-dropdown-icon svg {
          width: 100%;
          height: 100%;
        }
        .theme-dropdown-label {
          flex: 1;
          white-space: nowrap;
        }
        .theme-check {
          flex-shrink: 0;
          color: var(--primary);
        }

        /* 用户 */
        .header-user {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          transition: background 0.2s;
        }
        .header-user:hover {
          background: var(--bg-hover);
        }
        .user-avatar-text {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--primary);
          color: var(--text-on-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
        }
        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          transition: color 0.3s;
        }
        .user-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-4px);
          transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
          z-index: 200;
        }
        .user-dropdown.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .logout-btn {
          font-size: 13px;
          padding: 8px 16px;
          box-shadow: var(--shadow);
          white-space: nowrap;
          border-radius: 12px;
        }
        @media (max-width: 900px) {
          .theme-trigger-label { max-width: 0; opacity: 0; padding: 0; }
          .theme-trigger { padding: 0 8px; }
        }
        @media (max-width: 768px) {
          .header-title { display: none; }
          .user-name { display: none; }
        }
      `}</style>
    </header>
  )
}
