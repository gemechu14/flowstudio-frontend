import { useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'

export function DashboardCard({ children, style, onClick, className, ...rest }: {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
  className?: string
} & HTMLAttributes<HTMLDivElement>) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card-bg)',
        borderRadius: 12,
        border: '1px solid var(--card-border)',
        boxShadow: hovered && onClick ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, border-color 0.2s, background-color 0.25s',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
