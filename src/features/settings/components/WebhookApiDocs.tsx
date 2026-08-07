import { useState } from 'react'
import type { WebhookTrigger } from '../../workflows/api/workflows.api'
import { BASE_URL } from '../../../shared/api/client'
import { MONO, SANS } from '../lib/settingsUi'

export interface AgentDbInfo {
  agent_id: string
  agent_name: string
  tables: string[]
  row_filter_keys: string[]   // existing configured filter column names on the datasource
}

export function WebhookApiDocs({
  webhook,
  secret,
  agentDbInfo,
  onDismissSecret,
}: {
  webhook: WebhookTrigger
  secret: string | null
  agentDbInfo: AgentDbInfo[]
  onDismissSecret: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const [docsOpen, setDocsOpen] = useState(!!secret)
  const [lang, setLang] = useState<'curl' | 'json'>('curl')

  const sec = secret ?? '<your-secret>'
  const fireUrl = `${BASE_URL}/triggers/webhooks/${webhook.webhook_id}/trigger`
  const pollUrl = `${BASE_URL}/triggers/webhooks/${webhook.webhook_id}/runs/{run_id}`
  const resumeUrl = `${BASE_URL}/triggers/webhooks/${webhook.webhook_id}/runs/{run_id}/resume`

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    }).catch(() => {})
  }

  const hasDb = agentDbInfo.length > 0

  // agent_filters body fragment (shared between curl and json)
  const filterBody = hasDb
    ? agentDbInfo.slice(0, 2).reduce<Record<string, Record<string, unknown>>>((acc, info) => {
        const col = info.row_filter_keys[0] ?? 'user_id'
        acc[info.agent_id] = { [col]: { op: '=', value: 'your_value' } }
        return acc
      }, {})
    : { 'agent-uuid': { user_id: { op: '=', value: 'u_123' } } }

  // ── curl strings ──
  const filterExampleLines = hasDb
    ? agentDbInfo.slice(0, 2).map(info => {
        const col = info.row_filter_keys[0] ?? 'user_id'
        return `    // ${info.agent_name}\n    "${info.agent_id}": {\n      "${col}": {"op": "=", "value": "your_value"}\n    }`
      }).join(',\n')
    : `    "agent-uuid": {\n      "user_id": {"op": "=", "value": "u_123"}\n    }`

  const asyncCurl = `# Step 1 — fire the workflow
curl -X POST "${fireUrl}" \\
  -H "X-Webhook-Secret: ${sec}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "initial_input": "your prompt here"${hasDb ? `,
    "agent_filters": {
${filterExampleLines}
    }` : ''}
  }'

# Response: {"status": "accepted", "run_id": "abc-123"}`

  const pollCurl = `# Step 2 — poll until status changes
curl "${pollUrl}" \\
  -H "X-Webhook-Secret: ${sec}"

# While running:    {"status": "running"}
# On checkpoint:    {"status": "awaiting_checkpoint", "checkpoint": {...}}
# When done:        {"status": "completed", "final_output": "..."}`

  const resumeCurl = `# Step 3 (only if awaiting_checkpoint)
curl -X POST "${resumeUrl}" \\
  -H "X-Webhook-Secret: ${sec}" \\
  -H "Content-Type: application/json" \\
  -d '{"human_input": "APPROVE"}'`

  const syncCurl = `# Sync — wait for result inline (max 300s)
curl -X POST "${fireUrl}?mode=sync&timeout=120" \\
  -H "X-Webhook-Secret: ${sec}" \\
  -H "Content-Type: application/json" \\
  -d '{"initial_input": "your prompt here"}'

# Response: {"status": "completed", "final_output": "..."}`

  // ── JSON / REST strings ──
  const asyncJson = JSON.stringify({
    method: 'POST',
    url: fireUrl,
    headers: { 'X-Webhook-Secret': sec, 'Content-Type': 'application/json' },
    body: {
      initial_input: 'your prompt here',
      ...(hasDb ? { agent_filters: filterBody } : {}),
    },
    response: { status: 'accepted', run_id: 'abc-123' },
  }, null, 2)

  const pollJson = JSON.stringify({
    method: 'GET',
    url: pollUrl,
    headers: { 'X-Webhook-Secret': sec },
    responses: {
      running: { status: 'running' },
      awaiting_checkpoint: {
        status: 'awaiting_checkpoint',
        checkpoint: {
          checkpoint_id: 'cp_xyz',
          node_label: 'Review step',
          checkpoint_prompt: 'Does this look correct?',
          prior_output: 'the agent output so far...',
        },
      },
      completed: { status: 'completed', final_output: '...' },
    },
  }, null, 2)

  const resumeJson = JSON.stringify({
    method: 'POST',
    url: resumeUrl,
    headers: { 'X-Webhook-Secret': sec, 'Content-Type': 'application/json' },
    body: { human_input: 'APPROVE' },
    note: 'human_input can be any text. "APPROVE" accepts the prior output as-is.',
    response: { run_id: '...', status: 'resumed' },
  }, null, 2)

  const syncJson = JSON.stringify({
    method: 'POST',
    url: `${fireUrl}?mode=sync&timeout=120`,
    headers: { 'X-Webhook-Secret': sec, 'Content-Type': 'application/json' },
    body: { initial_input: 'your prompt here' },
    note: 'Not recommended if workflow has human checkpoint nodes.',
    response: { status: 'completed', final_output: '...' },
  }, null, 2)

  const CODE: React.CSSProperties = {
    ...MONO, fontSize: 10, whiteSpace: 'pre', overflowX: 'auto',
    background: 'var(--bg-hover)', color: 'var(--text-heading)',
    border: '1px solid var(--border)',
    padding: '10px 12px', borderRadius: 6, lineHeight: 1.55,
    display: 'block',
  }

  const copyBtn = (curlText: string, jsonText: string, key: string) => (
    <button
      onClick={() => copy(lang === 'curl' ? curlText : jsonText, key)}
      style={{
        ...MONO, fontSize: 9, padding: '2px 7px', flexShrink: 0,
        background: copied === key ? 'var(--accent-soft)' : 'transparent',
        border: `1px solid ${copied === key ? 'var(--blue-border)' : 'var(--border)'}`,
        color: copied === key ? 'var(--accent)' : 'var(--text-tertiary)',
        borderRadius: 4, cursor: 'pointer',
      }}
    >{copied === key ? 'Copied!' : 'Copy'}</button>
  )

  const agentCopyBtn = (text: string, key: string) => (
    <button
      onClick={() => copy(text, key)}
      style={{
        ...MONO, fontSize: 9, padding: '2px 7px', flexShrink: 0,
        background: copied === key ? 'var(--accent-soft)' : 'transparent',
        border: `1px solid ${copied === key ? 'var(--blue-border)' : 'var(--border)'}`,
        color: copied === key ? 'var(--accent)' : 'var(--text-tertiary)',
        borderRadius: 4, cursor: 'pointer',
      }}
    >{copied === key ? 'Copied!' : 'Copy'}</button>
  )

  const sectionLabel = (label: string, color: string) => (
    <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
  )

  const infoBox = (children: React.ReactNode) => (
    <div style={{
      background: 'var(--bg-page)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '10px 12px',
    }}>{children}</div>
  )

  const TAB: React.CSSProperties = {
    ...MONO, fontSize: 10, padding: '3px 10px', cursor: 'pointer',
    border: '1px solid var(--border)', borderRadius: 4,
  }

  return (
    <div>
      {/* Secret reveal — shown only once on creation */}
      {secret && (
        <div style={{
          margin: '8px 0',
          background: 'var(--untested-dim)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 7, padding: '10px 12px',
        }}>
          <div style={{
            ...MONO, fontSize: 10, color: 'var(--untested)', fontWeight: 700,
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ⚠ Save your secret — shown only once
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <code style={{
              ...MONO, fontSize: 11, flex: 1, background: 'var(--bg-hover)',
              color: 'var(--untested)', padding: '5px 8px', borderRadius: 5,
              border: '1px solid var(--border)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{secret}</code>
            {agentCopyBtn(secret, 'secret')}
          </div>
          <button
            onClick={onDismissSecret}
            style={{
              ...MONO, fontSize: 10, padding: '4px 12px',
              background: 'var(--accent)', color: 'var(--btn-upload-text)', border: '1px solid var(--accent)',
              borderRadius: 5, cursor: 'pointer', width: '100%',
            }}
          >I've saved it — dismiss</button>
        </div>
      )}

      {/* Toggle docs + lang switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: secret ? 0 : 4 }}>
        <button
          onClick={() => setDocsOpen(o => !o)}
          style={{
            ...MONO, fontSize: 10, padding: '3px 8px',
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-tertiary)', borderRadius: 4, cursor: 'pointer',
          }}
        >{docsOpen ? '▾ Hide API docs' : '▸ View API docs'}</button>

        {docsOpen && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setLang('curl')}
              style={{
                ...TAB,
                background: lang === 'curl' ? 'var(--accent)' : 'transparent',
                color: lang === 'curl' ? 'var(--accent-text)' : 'var(--text-tertiary)',
                borderColor: lang === 'curl' ? 'var(--accent)' : 'var(--border)',
              }}
            >curl</button>
            <button
              onClick={() => setLang('json')}
              style={{
                ...TAB,
                background: lang === 'json' ? 'var(--accent)' : 'transparent',
                color: lang === 'json' ? 'var(--accent-text)' : 'var(--text-tertiary)',
                borderColor: lang === 'json' ? 'var(--accent)' : 'var(--border)',
              }}
            >JSON</button>
          </div>
        )}
      </div>

      {docsOpen && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── Async flow ── */}
          <div>
            {sectionLabel('Async — fire and poll (recommended)', 'var(--accent)')}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>Step 1: fire the trigger</span>
              {copyBtn(asyncCurl, asyncJson, 'async')}
            </div>
            <code style={CODE}>{lang === 'curl' ? asyncCurl : asyncJson}</code>
          </div>

          {/* ── Poll + checkpoint ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>Step 2: poll for result (or checkpoint)</span>
              {copyBtn(pollCurl, pollJson, 'poll')}
            </div>
            <code style={CODE}>{lang === 'curl' ? pollCurl : pollJson}</code>
          </div>

          {/* ── Resume checkpoint ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>Step 3 (optional): answer a human checkpoint</span>
              {copyBtn(resumeCurl, resumeJson, 'resume')}
            </div>
            <code style={CODE}>{lang === 'curl' ? resumeCurl : resumeJson}</code>
            <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>
              Human checkpoint nodes are optional — only workflows that include them will ever return <code style={{ ...MONO, fontSize: 10 }}>awaiting_checkpoint</code>. After you answer, poll again until <code style={{ ...MONO, fontSize: 10 }}>status</code> is <code style={{ ...MONO, fontSize: 10 }}>completed</code> or <code style={{ ...MONO, fontSize: 10 }}>failed</code>.
            </div>
          </div>

          {/* ── Sync mode ── */}
          <div>
            {sectionLabel('Sync — wait for result inline', 'var(--accent)')}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>Single request, result in response</span>
              {copyBtn(syncCurl, syncJson, 'sync')}
            </div>
            <code style={CODE}>{lang === 'curl' ? syncCurl : syncJson}</code>
          </div>

          {/* ── agent_filters (only when DB datasources exist) ── */}
          {hasDb && infoBox(
            <>
              <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                agent_filters — row-level security
              </div>
              <div style={{ ...SANS, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
                Pass per-agent filters so each agent only sees rows matching your criteria.
                Two formats — flat (applies to all allowed tables) or per-table (explicit scoping):
              </div>
              <code style={{ ...CODE, marginBottom: 8 }}>{`// Flat — filter applied across all tables the agent can query
"${agentDbInfo[0].agent_id}": {
  "${agentDbInfo[0].row_filter_keys[0] ?? 'user_id'}": {"op": "=", "value": "u_123"},
  "status": {"op": "!=", "value": "deleted"}
}

// Per-table — scope each filter to a specific table
"${agentDbInfo[0].agent_id}": {
  "${agentDbInfo[0].tables[0] ?? 'orders'}": {
    "${agentDbInfo[0].row_filter_keys[0] ?? 'user_id'}": {"op": "=", "value": "u_123"}
  }${agentDbInfo[0].tables[1] ? `,
  "${agentDbInfo[0].tables[1]}": {
    "account_id": {"op": "=", "value": "acc_456"}
  }` : ''}
}

// Column alias override — use ":alias" as the column key to rename it in SQL
"${agentDbInfo[0].agent_id}": {
  ":uid": {"op": "=", "value": "u_123"}   // maps :uid → user_id in your WHERE clause
}`}</code>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Supported operators:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'ILIKE', 'NOT ILIKE', 'IN', 'NOT IN'].map(op => (
                  <span key={op} style={{
                    ...MONO, fontSize: 9, padding: '1px 6px', borderRadius: 3,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    border: '1px solid var(--blue-border)',
                  }}>{op}</span>
                ))}
              </div>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Agents with database access in this workflow:
              </div>
              {agentDbInfo.map(info => (
                <div key={info.agent_id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ ...MONO, fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{info.agent_name}</span>
                    <span style={{ ...MONO, fontSize: 9, color: 'var(--text-tertiary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.agent_id}</span>
                    {agentCopyBtn(info.agent_id, `agent-${info.agent_id}`)}
                  </div>
                  {info.tables.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {info.tables.map(t => (
                        <span key={t} style={{ ...MONO, fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--blue-border)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {info.row_filter_keys.length > 0 && (
                    <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Configured filter columns: <span style={{ ...MONO }}>{info.row_filter_keys.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

        </div>
      )}
    </div>
  )
}

