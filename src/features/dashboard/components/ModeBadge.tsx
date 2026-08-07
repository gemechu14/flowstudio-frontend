

export function ModeBadge({ mode }: { mode: string }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 500,
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-secondary)',
      textTransform: 'lowercase',
      whiteSpace: 'nowrap',
    }}>
      {mode.replace('_', ' ')}
    </span>
  )
}
