import { MONO, SANS } from '../lib/settingsUi'

export function SectionHeading({ label, title, subtitle }: {
  label: string
  title: string
  subtitle: string
}) {
  return (
    <div className="settings-heading" style={{ marginBottom: 20 }}>
      <div style={{
        ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        color: 'var(--accent)', marginBottom: 6,
      }}>
        {label}
      </div>
      <h2 style={{ ...SANS, fontSize: 16, fontWeight: 500, color: 'var(--text-heading)', margin: 0 }}>
        {title}
      </h2>
      <p style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
        {subtitle}
      </p>
    </div>
  )
}
