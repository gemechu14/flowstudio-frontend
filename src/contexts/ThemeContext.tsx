import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
  collapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (v: boolean) => void
  mobileNavOpen: boolean
  setMobileNavOpen: (v: boolean) => void
  toggleMobileNav: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  collapsed: false,
  toggleCollapsed: () => {},
  setCollapsed: () => {},
  mobileNavOpen: false,
  setMobileNavOpen: () => {},
  toggleMobileNav: () => {},
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

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

  function toggleMobileNav() {
    setMobileNavOpen(o => !o)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme, toggleTheme, setTheme,
        collapsed, toggleCollapsed, setCollapsed,
        mobileNavOpen, setMobileNavOpen, toggleMobileNav,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
