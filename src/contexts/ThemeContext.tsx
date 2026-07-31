import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
  collapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (v: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  collapsed: false,
  toggleCollapsed: () => {},
  setCollapsed: () => {},
})

const THEME_KEY = 'cl_theme'
const COLLAPSE_KEY = 'cl_sidebar_collapsed'

function readTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {}
  return false
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme())
  const [collapsed, setCollapsedState] = useState(() => readCollapsed())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '72px' : '240px',
    )
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {}
  }, [collapsed])

  function setTheme(mode: ThemeMode) {
    setThemeState(mode)
  }

  function toggleTheme() {
    setThemeState(t => (t === 'dark' ? 'light' : 'dark'))
  }

  function setCollapsed(v: boolean) {
    setCollapsedState(v)
  }

  function toggleCollapsed() {
    setCollapsedState(c => !c)
  }

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme, collapsed, toggleCollapsed, setCollapsed }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
