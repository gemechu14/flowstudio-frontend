interface ValidationResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

interface ToolValidatorProps {
  filename: string
  result: ValidationResult
}

export default function ToolValidator({ filename, result }: ToolValidatorProps) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${result.passed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        background: result.passed ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
        padding: '16px 18px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: result.errors.length > 0 || result.warnings.length > 0 ? 14 : 0 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: result.passed ? 'var(--verified)' : 'var(--invalid)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {result.passed ? '✓' : '✗'}
        </span>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              fontWeight: 700,
              color: result.passed ? 'var(--verified)' : 'var(--invalid)',
            }}
          >
            {result.passed ? 'Validation passed' : 'Validation failed'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-body)', marginTop: 1 }}>
            {filename}
          </div>
        </div>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div style={{ marginBottom: result.warnings.length > 0 ? 10 : 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'var(--invalid)',
              marginBottom: 6,
            }}
          >
            Errors ({result.errors.length})
          </div>
          {result.errors.map((err, i) => (
            <div
              key={i}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--invalid)',
                padding: '5px 10px',
                background: 'rgba(239,68,68,0.08)',
                borderRadius: 5,
                marginBottom: 4,
                lineHeight: 1.5,
              }}
            >
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'var(--untested)',
              marginBottom: 6,
            }}
          >
            Warnings ({result.warnings.length})
          </div>
          {result.warnings.map((warn, i) => (
            <div
              key={i}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--untested)',
                padding: '5px 10px',
                background: 'rgba(245,158,11,0.08)',
                borderRadius: 5,
                marginBottom: 4,
                lineHeight: 1.5,
              }}
            >
              {warn}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
