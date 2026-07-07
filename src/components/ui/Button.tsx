import { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  loading?: boolean
  style?: CSSProperties
}

const VARIANT_STYLES: Record<Variant, CSSProperties> = {
  primary: {
    background: 'var(--blue)',
    color: '#ffffff',
    border: '1px solid transparent',
  },
  secondary: {
    background: 'var(--blue-dim)',
    color: 'var(--blue)',
    border: '1px solid var(--blue-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-body)',
    border: '1px solid var(--border-light)',
  },
  danger: {
    background: 'var(--invalid-dim)',
    color: 'var(--invalid)',
    border: '1px solid rgba(239,68,68,0.25)',
  },
}

const SIZE_STYLES: Record<Size, CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: 12, borderRadius: 6 },
  md: { padding: '7px 16px', fontSize: 13, borderRadius: 8 },
  lg: { padding: '10px 22px', fontSize: 14, borderRadius: 8 },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        opacity: isDisabled ? 0.55 : 1,
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return
        const el = e.currentTarget
        if (variant === 'primary') {
          el.style.background = 'var(--blue-hover)'
        } else {
          el.style.opacity = '0.85'
        }
      }}
      onMouseLeave={(e) => {
        if (isDisabled) return
        const el = e.currentTarget
        el.style.background = VARIANT_STYLES[variant].background as string
        el.style.opacity = '1'
      }}
      {...rest}
    >
      {loading && (
        <span
          style={{
            width: 12,
            height: 12,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      )}
      {children}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  )
}
