import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TabNav from './components/layout/TabNav'
import MacroBar from './components/layout/MacroBar'
import ErrorBoundary from './components/layout/ErrorBoundary'
import DailyOverview from './pages/DailyOverview'
import StockResearch from './pages/StockResearch'
import IndustryView from './pages/IndustryView'
import CatalystView from './pages/CatalystView'
import Journal from './pages/Journal'
import Login from './pages/Login'
import { useAuthStore, useThemeStore } from './store/globalStore'

function ProtectedLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-900">
      <MacroBar />
      <TabNav />
      <main className="flex-1 px-4 py-5 max-w-screen-2xl mx-auto w-full">
        <Routes>
          <Route path="/" element={<ErrorBoundary><DailyOverview /></ErrorBoundary>} />
          <Route path="/research" element={<ErrorBoundary><StockResearch /></ErrorBoundary>} />
          <Route path="/industry" element={<ErrorBoundary><IndustryView /></ErrorBoundary>} />
          <Route path="/catalysts" element={<ErrorBoundary><CatalystView /></ErrorBoundary>} />
          <Route path="/journal" element={<ErrorBoundary><Journal /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const token = useAuthStore((s) => s.token)
  const { theme } = useThemeStore()

  // Keep <html> class in sync with store (handles SSR/rehydration edge cases)
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return <ProtectedLayout />
}
