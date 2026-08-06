import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastData {
  type: ToastType
  message: string
}

type ToastContextValue = {
  toast: ToastData | null
  show: (type: ToastType, message: string, durationMs?: number) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const SANS = { fontFamily: 'var(--font-sans)' } as const

const STYLES: Record<ToastType, { iconBg: string; iconColor: string; icon: string }> = {
  success: {
    iconBg: 'var(--accent-soft)',
    iconColor: 'var(--accent-text)',
    icon: '✓',
  },
  error: {
    iconBg: 'var(--invalid-dim)',
    iconColor: 'var(--invalid)',
    icon: '!',
  },
  info: {
    iconBg: 'var(--bg-hover)',
    iconColor: 'var(--text-secondary)',
    icon: 'i',
  },
}

function ToastViewport({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !toast) return null

  const s = STYLES[toast.type]

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="app-toast"
      data-type={toast.type}
    >
      <span
        className="app-toast-icon"
        style={{
          background: s.iconBg,
          color: s.iconColor,
        }}
      >
        {s.icon}
      </span>
      <span style={{ flex: 1, lineHeight: 1.35, ...SANS }}>{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="app-toast-close"
      >
        ×
      </button>
    </div>,
    document.body,
  )
}

/** App-level provider — render once near the root so toasts always pin to the viewport. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setToast(null)
  }, [])

  const show = useCallback((type: ToastType, message: string, durationMs?: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ type, message })
    const ms = durationMs ?? (type === 'error' ? 4000 : 2800)
    timerRef.current = setTimeout(() => {
      setToast(null)
      timerRef.current = null
    }, ms)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const value = useMemo(() => ({ toast, show, dismiss }), [toast, show, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={toast} onClose={dismiss} />
    </ToastContext.Provider>
  )
}

/** Call from any page under `ToastProvider`. */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
