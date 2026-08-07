import { McpServersSection } from '../components/McpServersSection'
import { ApiKeysSection } from '../components/ApiKeysSection'
import { TriggersSection } from '../components/TriggersSection'
import { SANS } from '../lib/settingsUi'

export default function SettingsPage() {
  return (
    <div
      className="settings-page"
      style={{
        padding: '28px 36px',
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--bg-surface)',
        minHeight: '100%',
        ...SANS,
      }}
    >
      <McpServersSection />

      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 40 }} />

      <ApiKeysSection />

      <div style={{ borderTop: '1px solid var(--border)', margin: '40px 0' }} />

      <TriggersSection />
    </div>
  )
}
