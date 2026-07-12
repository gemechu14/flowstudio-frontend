import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div style={{
        padding: 32, fontFamily: 'monospace', color: '#EF4444',
        background: '#1a0000', height: '100%', overflow: 'auto',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          React Error — component crashed
        </div>
        <div style={{ fontSize: 13, marginBottom: 16, color: '#fca5a5' }}>
          {error.message}
        </div>
        <pre style={{ fontSize: 11, color: '#f87171', whiteSpace: 'pre-wrap', marginBottom: 24 }}>
          {error.stack}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            padding: '8px 20px', background: '#EF4444', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}
        >
          Retry
        </button>
      </div>
    )
  }
}
