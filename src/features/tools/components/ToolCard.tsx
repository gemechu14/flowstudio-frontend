import Badge, { type BadgeStatus } from '../../../shared/components/ui/Badge'
import Button from '../../../shared/components/ui/Button'

export interface ToolParam {
  name: string
  type: string
}

export interface Tool {
  id: string
  name: string
  description: string
  status: BadgeStatus
  source: 'built-in' | 'custom'
  params: ToolParam[]
  error?: string
}

interface ToolCardProps {
  tool: Tool
  onTest: (tool: Tool) => void
}

export default function ToolCard({ tool, onTest }: ToolCardProps) {
  const isInvalid = tool.status === 'invalid'

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 0.18s ease',
        borderLeft: isInvalid ? '3px solid var(--invalid)' : '3px solid transparent',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = 'var(--shadow-card-hover)'
        el.style.borderColor = isInvalid ? 'rgba(239,68,68,0.35)' : 'var(--blue-border)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = 'var(--shadow-card)'
        el.style.borderColor = 'var(--border-light)'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 14,
                color: 'var(--text-dark)',
              }}
            >
              {tool.name}
            </span>
            <Badge status={tool.status} size="sm" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: tool.source === 'built-in' ? 'var(--blue-muted)' : 'var(--text-body)',
                background: tool.source === 'built-in' ? 'var(--blue-dim)' : 'rgba(74,81,99,0.08)',
                padding: '2px 7px',
                borderRadius: 4,
              }}
            >
              {tool.source}
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-body)',
              marginTop: 5,
              lineHeight: 1.5,
            }}
          >
            {tool.description}
          </p>
        </div>

        {/* Test button */}
        <Button
          variant={isInvalid ? 'ghost' : 'secondary'}
          size="sm"
          onClick={() => onTest(tool)}
          disabled={isInvalid}
          title={isInvalid ? 'Fix validation errors before testing' : `Test ${tool.name}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polygon points="2,1 11,6 2,11" fill="currentColor" />
          </svg>
          Test
        </Button>
      </div>

      {/* Params */}
      {tool.params.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-body)',
              marginRight: 2,
            }}
          >
            Params:
          </span>
          {tool.params.map((p) => (
            <span
              key={p.name}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-dark)',
                background: 'rgba(11,16,32,0.05)',
                border: '1px solid rgba(11,16,32,0.08)',
                borderRadius: 4,
                padding: '1px 8px',
              }}
            >
              {p.name}
              <span style={{ color: 'var(--blue-muted)', marginLeft: 3 }}>:{p.type}</span>
            </span>
          ))}
        </div>
      )}

      {tool.params.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-body)' }}>
            Params:
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-body)', fontStyle: 'italic' }}>
            none
          </span>
        </div>
      )}

      {/* Error message */}
      {isInvalid && tool.error && (
        <div
          style={{
            background: 'var(--invalid-dim)',
            border: '1px solid rgba(239,68,68,0.20)',
            borderRadius: 6,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <span style={{ color: 'var(--invalid)', fontSize: 13, marginTop: 1 }}>✗</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--invalid)', lineHeight: 1.5 }}>
            {tool.error}
          </span>
        </div>
      )}
    </div>
  )
}
