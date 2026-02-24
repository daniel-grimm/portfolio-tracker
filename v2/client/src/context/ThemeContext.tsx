import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../lib/auth'
import { getUserPreferences, patchUserPreferences } from '../lib/api'
import type { Theme } from 'shared'

const STORAGE_KEY = 'vibefolio-theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function readLocalTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return 'dark'
  } catch {}
  return 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readLocalTheme)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: session } = useSession()

  // Fetch DB preference once authenticated
  const { data: prefs } = useQuery({
    queryKey: ['user', 'preferences'],
    queryFn: getUserPreferences,
    enabled: Boolean(session?.user),
  })

  // Sync DB preference → state + localStorage (DB wins after login)
  useEffect(() => {
    if (prefs) {
      setThemeState(prefs.theme)
      applyTheme(prefs.theme)
      try { localStorage.setItem(STORAGE_KEY, prefs.theme) } catch {}
    }
  }, [prefs])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void patchUserPreferences(next)
    }, 500)
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
