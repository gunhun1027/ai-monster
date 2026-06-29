import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCapsuleControl } from '../hooks/useCapsuleControl'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState<'login' | 'register'>(() =>
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const activeTabIndex = tab === 'login' ? 0 : 1

  const handleTabActivate = useCallback((index: number) => {
    setTab(index === 0 ? 'login' : 'register')
    setError(null)
  }, [])

  const { containerRef: tabsContainerRef, indicatorRef: tabsIndicatorRef, displayIndex, indicatorProgress } = useCapsuleControl({
    itemCount: 2,
    activeIndex: activeTabIndex,
    onActivate: handleTabActivate,
  })

  const getTabColor = (index: number): string => {
    const distance = Math.abs(indicatorProgress - index)
    if (distance < 0.5) return 'var(--text-on-primary)'
    if (distance < 1.0) {
      const t = distance - 0.5
      return t > 0.25 ? 'var(--text-secondary)' : 'var(--text-on-primary)'
    }
    return 'var(--text-secondary)'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!loginForm.username.trim()) { setError('请输入用户名'); return }
    if (!loginForm.password) { setError('请输入密码'); return }
    setSubmitting(true)
    try {
      await login(loginForm.username.trim(), loginForm.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!registerForm.username.trim()) { setError('请输入用户名'); return }
    if (!registerForm.email.trim()) { setError('请输入邮箱'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registerForm.email.trim())) { setError('邮箱格式不正确'); return }
    if (!registerForm.password || registerForm.password.length < 6) { setError('密码至少 6 位'); return }
    if (registerForm.password !== registerForm.confirmPassword) { setError('两次输入的密码不一致'); return }
    setSubmitting(true)
    try {
      await register(registerForm.username.trim(), registerForm.email.trim(), registerForm.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-header">
          <img src="/assets/logo/logo-256.svg" alt="Logo" className="login-logo" />
          <h1 className="login-title">AI出题怪兽</h1>
          <p className="login-subtitle">答题闯关，养成你的专属怪兽</p>
        </div>

        <div className="login-tabs sliding-tabs" ref={tabsContainerRef}>
          <div className="login-tab-indicator sliding-indicator" ref={tabsIndicatorRef} />
          <div
            className={'login-tab sliding-tab' + (0 === displayIndex ? ' active' : '')}
            style={{ color: getTabColor(0) }}
          >
            登录
          </div>
          <div
            className={'login-tab sliding-tab' + (1 === displayIndex ? ' active' : '')}
            style={{ color: getTabColor(1) }}
          >
            注册
          </div>
        </div>

        {tab === 'login' && (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-field">
              <label className="form-label">用户名</label>
              <input
                className="input"
                type="text"
                placeholder="请输入用户名"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                autoComplete="username"
              />
            </div>
            <div className="form-field">
              <label className="form-label">密码</label>
              <input
                className="input"
                type="password"
                placeholder="请输入密码"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
              {submitting ? '登录中...' : '登录'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form className="login-form" onSubmit={handleRegister}>
            <div className="form-field">
              <label className="form-label">用户名</label>
              <input
                className="input"
                type="text"
                placeholder="请输入用户名"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                autoComplete="username"
              />
            </div>
            <div className="form-field">
              <label className="form-label">邮箱</label>
              <input
                className="input"
                type="email"
                placeholder="请输入邮箱"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                autoComplete="email"
              />
            </div>
            <div className="form-field">
              <label className="form-label">密码</label>
              <input
                className="input"
                type="password"
                placeholder="至少 6 位"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div className="form-field">
              <label className="form-label">确认密码</label>
              <input
                className="input"
                type="password"
                placeholder="请再次输入密码"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
              {submitting ? '注册中...' : '注册'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--bg-main);
          transition: background 0.3s;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 36px 28px;
        }
        .login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
        }
        .login-logo {
          width: 56px;
          height: 56px;
          border-radius: var(--radius);
        }
        .login-title {
          font-size: 22px;
          font-weight: 600;
          color: var(--text-primary);
          transition: color 0.3s;
        }
        .login-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          transition: color 0.3s;
        }
        .login-tabs {
          margin-bottom: 24px;
        }
        .login-tab {
          padding: 9px 20px;
          font-size: 14px;
          pointer-events: none;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: color 0.3s;
        }
        .form-error {
          color: var(--danger);
          font-size: 13px;
          text-align: center;
          padding: 8px 12px;
          background: var(--danger-light);
          border-radius: var(--radius-sm);
        }
        .login-submit {
          width: 100%;
          margin-top: 4px;
          padding: 12px;
          font-size: 15px;
          border-radius: var(--radius-full);
        }
      `}</style>
    </div>
  )
}
