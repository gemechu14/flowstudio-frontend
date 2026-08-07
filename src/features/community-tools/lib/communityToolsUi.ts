import type { CSSProperties, FocusEvent } from 'react'

export const MONO = { fontFamily: 'var(--font-mono)' } as const
export const SANS = { fontFamily: 'var(--font-sans)' } as const

export const FIELD: CSSProperties = {
  ...SANS,
  fontSize: 13,
  padding: '10px 14px',
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-heading)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  colorScheme: 'dark light',
}

export const SELECT: CSSProperties = {
  ...FIELD,
  fontSize: 14,
  paddingRight: 32,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  cursor: 'pointer',
  minWidth: 160,
  backgroundColor: 'var(--card-bg)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}

export function focusField(e: FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--accent)'
  e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
}

export function blurField(e: FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border)'
  e.target.style.boxShadow = 'none'
}
