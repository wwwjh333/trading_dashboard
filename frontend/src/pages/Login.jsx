import { useState } from 'react'
import { authApi } from '../api/index'
import { useAuthStore, useThemeStore } from '../store/globalStore'
import { useTranslation } from 'react-i18next'
import { setLanguage } from '../i18n/index'

export default function Login() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const { theme, toggleTheme } = useThemeStore()
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fn = mode === 'login' ? authApi.login : authApi.register
      const data = await fn(username, password)
      setAuth(data.access_token, data.user_id, data.username)
    } catch (err) {
      setError(err.response?.data?.detail ?? '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900">
      {/* Top-right controls */}
      <div className="fixed top-4 right-4 flex gap-2">
        <button
          onClick={() => setLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          {i18n.language === 'zh' ? 'EN' : '中'}
        </button>
        <button
          onClick={toggleTheme}
          className="btn-secondary text-xs py-1.5 px-3"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☽'}
        </button>
      </div>

      <div className="w-full max-w-sm px-4">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-blue/15 border border-accent-blue/30 mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-100">{t('auth.title')}</h1>
        </div>

        <div className="card shadow-card-lg space-y-5">
          {/* Mode tabs */}
          <div className="flex rounded-lg overflow-hidden border border-surface-600 bg-surface-700 p-1 gap-1">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-1.5 text-sm rounded-md transition-all font-medium ${
                  mode === m
                    ? 'bg-accent-blue text-surface-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'login' ? t('auth.login') : t('auth.register')}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">{t('auth.username')}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.username')}
                className="input-field"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            {error && (
              <div className="text-accent-red text-xs bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  {t('common.loading')}
                </span>
              ) : mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
        </p>
      </div>
    </div>
  )
}
