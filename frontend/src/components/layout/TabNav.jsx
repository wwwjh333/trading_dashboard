import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore, useThemeStore } from '../../store/globalStore'
import { useTranslation } from 'react-i18next'
import { setLanguage } from '../../i18n/index'
import WatchlistManager from './WatchlistManager'

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export default function TabNav() {
  const { username, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { t, i18n } = useTranslation()
  const [showWatchlist, setShowWatchlist] = useState(false)

  const TABS = [
    { to: '/', label: t('nav.overview'), exact: true },
    { to: '/research', label: t('nav.research') },
    { to: '/industry', label: t('nav.industry') },
    { to: '/catalysts', label: t('nav.catalyst') },
    { to: '/journal', label: t('nav.trades') },
  ]

  const toggleLang = () => {
    setLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  }

  return (
    <nav className="bg-surface-800 border-b border-surface-600 flex items-center sticky top-0 z-40">
      {/* Brand */}
      <div className="px-4 border-r border-surface-600 h-full flex items-center">
        <span className="text-sm font-bold text-accent-blue tracking-tight whitespace-nowrap">TD</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-1 overflow-x-auto scrollbar-hidden">
        {TABS.map(({ to, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-accent-blue text-accent-blue font-medium'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-surface-500',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right side controls */}
      <div className="px-3 flex items-center gap-1 flex-shrink-0 border-l border-surface-600">
        {/* Watchlist manager */}
        <div className="relative">
          <button
            onClick={() => setShowWatchlist((v) => !v)}
            className={clsx(
              'btn-ghost text-xs flex items-center gap-1 py-1.5 px-2',
              showWatchlist && 'bg-surface-700 text-gray-200'
            )}
            title={t('watchlist.title')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <span className="hidden sm:inline">{t('watchlist.title')}</span>
          </button>
          {showWatchlist && <WatchlistManager onClose={() => setShowWatchlist(false)} />}
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="btn-ghost text-xs py-1.5 px-2 font-semibold tabular-nums"
          title={t('common.switchLanguage')}
        >
          {i18n.language === 'zh' ? 'EN' : '中'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-ghost py-1.5 px-2"
          title={theme === 'dark' ? t('common.switchLightMode') : t('common.switchDarkMode')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* User */}
        {username && (
          <span className="text-gray-500 text-xs hidden md:inline mx-1">{username}</span>
        )}
        <button
          onClick={clearAuth}
          className="btn-ghost text-xs py-1.5 px-2 text-gray-500"
          title={t('common.signOut')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </nav>
  )
}
