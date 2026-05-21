import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useGlobalStore = create((set) => ({
  selectedTicker: 'NVDA',
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),

  dateRange: 90,
  setDateRange: (days) => set({ dateRange: days }),
}))

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      userId: null,
      username: null,
      setAuth: (token, userId, username) => set({ token, userId, username }),
      clearAuth: () => set({ token: null, userId: null, username: null }),
    }),
    { name: 'auth-storage' },
  ),
)

// ── Theme Store ──────────────────────────────────────────────────
function applyTheme(theme) {
  const el = document.documentElement
  if (theme === 'light') {
    el.classList.add('light')
  } else {
    el.classList.remove('light')
  }
}

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark'
          applyTheme(next)
          return { theme: next }
        }),
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
    }),
    {
      name: 'ui-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
