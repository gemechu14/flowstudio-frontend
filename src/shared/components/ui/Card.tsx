import { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  hoverable?: boolean
  padding?: string
  onClick?: () => void
}

export default function Card({ children, style, hoverable = false, padding = '20px', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding,
        transition: hoverable ? 'all 0.18s ease' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={
        hoverable
          ? (e) => {
              const el = e.currentTarget
              el.style.boxShadow = 'var(--shadow-card-hover)'
              el.style.borderColor = 'var(--blue-border)'
              el.style.transform = 'translateY(-1px)'
            }
          : undefined
      }
      onMouseLeave={
        hoverable
          ? (e) => {
              const el = e.currentTarget
              el.style.boxShadow = 'var(--shadow-card)'
              el.style.borderColor = 'var(--border-light)'
              el.style.transform = 'translateY(0)'
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}
