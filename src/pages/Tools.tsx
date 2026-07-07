import { useState, useEffect } from 'react'
import ToolCard, { Tool } from '../components/tools/ToolCard'
import ToolUploader, { UploadOutcome } from '../components/tools/ToolUploader'
import ToolTester from '../components/tools/ToolTester'
import Button from '../components/ui/Button'
import { BadgeStatus } from '../components/ui/Badge'
import { listTools } from '../api/tools'

const MOCK_TOOLS: Tool[] = [
  {
    id: 'web_search',
    name: 'web_search',
    description: 'Searches the web and returns top results with titles, URLs, and snippets.',
    status: 'verified',
    source: 'built-in',
    params: [
      { name: 'query', type: 'str' },
      { name: 'max_results', type: 'int' },
    ],
  },
  {
    id: 'run_sql',
    name: 'run_sql',
    description: 'Executes a SQL query against the connected data warehouse and returns rows as JSON.',
    status: 'verified',
    source: 'built-in',
    params: [{ name: 'query', type: 'str' }],
  },
  {
    id: 'send_slack',
    name: 'send_slack',
    description: 'Posts a message to a Slack channel via the Slack Web API.',
    status: 'untested',
    source: 'built-in',
    params: [
      { name: 'channel', type: 'str' },
      { name: 'message', type: 'str' },
    ],
  },
  {
    id: 'get_schema',
    name: 'get_schema',
    description: 'Retrieves the current database schema including all table names and dialect version.',
    status: 'verified',
    source: 'built-in',
    params: [],
  },
  {
    id: 'crm_lookup',
    name: 'crm_lookup.py',
    description: 'Custom tool for looking up contact and company data from the CRM.',
    status: 'invalid',
    source: 'custom',
    params: [{ name: 'email', type: 'str' }],
    error: 'Line 8: run() method missing — tool must export a run(params) function',
  },
]

type FilterStatus = 'all' | BadgeStatus

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>(MOCK_TOOLS)
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [showUploader, setShowUploader] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'built-in' | 'custom'>('all')

  useEffect(() => {
    listTools().then((apiTools) => {
      const customTools: Tool[] = apiTools.map((t) => ({
        id: t.name,
        name: t.name,
        description: t.description,
        status: 'untested' as const,
        source: 'custom' as const,
        params: t.parameters.map((p) => ({ name: p.name, type: p.type })),
      }))
      setTools([...MOCK_TOOLS, ...customTools])
    }).catch(() => {
      // backend not running — keep mock tools
    })
  }, [])

  const handleUpload = (outcome: UploadOutcome) => {
    const newTool: Tool = {
      id: outcome.toolName,
      name: outcome.toolName,
      description: 'Newly uploaded custom tool — click Test to verify.',
      status: 'untested',
      source: 'custom',
      params: [],
    }
    setTools((prev) => [newTool, ...prev.filter((t) => t.id !== outcome.toolName)])
    setTimeout(() => setShowUploader(false), 1500)
  }

  const filtered = tools.filter((t) => {
    const statusMatch = filterStatus === 'all' || t.status === filterStatus
    const sourceMatch = filterSource === 'all' || t.source === filterSource
    return statusMatch && sourceMatch
  })

  const counts = {
    all: tools.length,
    verified: tools.filter((t) => t.status === 'verified').length,
    untested: tools.filter((t) => t.status === 'untested').length,
    invalid: tools.filter((t) => t.status === 'invalid').length,
  }

  return (
    <div style={{ padding: '40px 48px', width: '100%' }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--blue)',
              marginBottom: 6,
            }}
          >
            Configuration
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)' }}>
            Tool Library
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-body)', marginTop: 4 }}>
            Manage built-in and custom tools available to your agents.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setShowUploader((v) => !v)}
          style={{ marginTop: 4 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Upload Tool
        </Button>
      </div>

      {/* Upload zone */}
      {showUploader && (
        <div style={{ marginBottom: 24 }}>
          <ToolUploader onUpload={handleUpload} />
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Status filters */}
        {(
          [
            { value: 'all', label: `All (${counts.all})` },
            { value: 'verified', label: `● Verified (${counts.verified})` },
            { value: 'untested', label: `◐ Untested (${counts.untested})` },
            { value: 'invalid', label: `✗ Invalid (${counts.invalid})` },
          ] as { value: FilterStatus; label: string }[]
        ).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: `1px solid ${filterStatus === f.value ? 'var(--blue-border)' : 'var(--border-light)'}`,
              background: filterStatus === f.value ? 'var(--blue-dim)' : 'transparent',
              color:
                filterStatus === f.value
                  ? 'var(--blue)'
                  : 'var(--text-body)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 4px' }} />

        {/* Source filters */}
        {(
          [
            { value: 'all', label: 'All sources' },
            { value: 'built-in', label: 'Built-in' },
            { value: 'custom', label: 'Custom' },
          ] as { value: 'all' | 'built-in' | 'custom'; label: string }[]
        ).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterSource(f.value)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: `1px solid ${filterSource === f.value ? 'var(--blue-border)' : 'var(--border-light)'}`,
              background: filterSource === f.value ? 'var(--blue-dim)' : 'transparent',
              color: filterSource === f.value ? 'var(--blue)' : 'var(--text-body)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tool list */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '56px 24px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
            No tools match this filter
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-body)', marginTop: 4 }}>
            Try a different filter or upload a new tool.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onTest={setActiveTool} />
          ))}
        </div>
      )}

      {/* Tester panel */}
      <ToolTester tool={activeTool} onClose={() => setActiveTool(null)} />
    </div>
  )
}
