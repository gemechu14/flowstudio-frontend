import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type WorkflowRecord, type WorkflowNode, type ScheduleTrigger, type WebhookTrigger,
  listWorkflows, listSchedules, createSchedule, deleteSchedule,
  listWebhooks, createWebhook, deleteWebhook, rotateWebhookSecret,
} from '../../workflows/api/workflows.api'
import { type AgentRecord, listAgents } from '../../agents/api/agents.api'
import { type DataSourceRecord, listDataSources } from '../../data-sources/api/dataSources.api'
import { BASE_URL } from '../../../shared/api/client'
import { TIMEZONES } from '../../../shared/constants'
import { queryKeys } from '../../../shared/api/queryKeys'
import { SectionHeading } from './SectionHeading'
import { CronBuilder } from './CronBuilder'
import { WebhookApiDocs, type AgentDbInfo } from './WebhookApiDocs'
import { MONO, SANS, fmtDate } from '../lib/settingsUi'

export function TriggersSection() {
  const [selectedWfId, setSelectedWfId] = useState<string>('')
  const [schedules, setSchedules] = useState<ScheduleTrigger[]>([])
  const [webhooks, setWebhooks] = useState<WebhookTrigger[]>([])
  const [loadingTriggers, setLoadingTriggers] = useState(false)
  const [newCronExpr, setNewCronExpr] = useState('')
  const [newTimezone, setNewTimezone] = useState('UTC')
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  // Map from webhook_id → secret (kept in local state only until dismissed)
  const [pendingSecrets, setPendingSecrets] = useState<Record<string, string>>({})

  const { data: workflows = [] } = useQuery({
    queryKey: queryKeys.workflows,
    queryFn: () => listWorkflows().catch(() => [] as WorkflowRecord[]),
  })
  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents,
    queryFn: () => listAgents().catch(() => [] as AgentRecord[]),
  })
  const { data: datasources = [] } = useQuery({
    queryKey: queryKeys.dataSources,
    queryFn: () => listDataSources().catch(() => [] as DataSourceRecord[]),
  })

  const selectedWf = workflows.find(w => w.workflow_id === selectedWfId) ?? null
  const agentNodes: WorkflowNode[] = selectedWf
    ? (selectedWf.nodes ?? []).filter(n => n.node_type === 'agent' && n.agent_id)
    : []
  const agentsById: Record<string, AgentRecord> = Object.fromEntries(
    agents.map(a => [a.agent_id, a])
  )
  const dbSourcesById: Record<string, DataSourceRecord> = Object.fromEntries(
    datasources.filter(d => d.source_type === 'database').map(d => [d.source_id, d])
  )
  const agentDbInfo: AgentDbInfo[] = agentNodes.reduce<AgentDbInfo[]>((acc, n) => {
    const agent = agentsById[n.agent_id ?? '']
    if (!agent) return acc
    const dbSources = (agent.datasource_ids ?? []).map(id => dbSourcesById[id]).filter(Boolean)
    if (dbSources.length === 0) return acc
    const tables = Array.from(new Set(dbSources.flatMap(ds => ds.allowed_tables ?? [])))
    const row_filter_keys = Array.from(new Set(
      dbSources.flatMap(ds => Object.keys(ds.row_filters ?? {}))
        .map(k => k.startsWith(':') ? k.slice(1) : k)
    ))
    acc.push({ agent_id: agent.agent_id, agent_name: agent.name, tables, row_filter_keys })
    return acc
  }, [])

  const loadTriggers = useCallback((wfId: string) => {
    if (!wfId) return
    setLoadingTriggers(true)
    Promise.all([
      listSchedules(wfId).catch(() => [] as ScheduleTrigger[]),
      listWebhooks(wfId).catch(() => [] as WebhookTrigger[]),
    ]).then(([s, w]) => {
      setSchedules(s)
      setWebhooks(w)
    }).finally(() => setLoadingTriggers(false))
  }, [])

  const handleSelectWf = (wfId: string) => {
    setSelectedWfId(wfId)
    setSchedules([])
    setWebhooks([])
    setShowAddSchedule(false)
    setNewCronExpr('')
    setNewTimezone('UTC')
    setPendingSecrets({})
    if (wfId) loadTriggers(wfId)
  }

  const handleAddSchedule = async () => {
    if (!selectedWfId || !newCronExpr.trim()) return
    setSavingSchedule(true)
    try {
      const s = await createSchedule(selectedWfId, newCronExpr.trim(), newTimezone)
      setSchedules(prev => [...prev, s])
      setNewCronExpr('')
      setNewTimezone('UTC')
      setShowAddSchedule(false)
    } catch { /* ignore */ } finally { setSavingSchedule(false) }
  }

  const handleDeleteSchedule = async (triggerId: string) => {
    await deleteSchedule(triggerId).catch(() => {})
    setSchedules(prev => prev.filter(s => s.trigger_id !== triggerId))
  }

  const handleAddWebhook = async () => {
    if (!selectedWfId) return
    setSavingWebhook(true)
    try {
      const w = await createWebhook(selectedWfId)
      // w.secret is only present on creation — stash it in local state
      if (w.secret) {
        setPendingSecrets(prev => ({ ...prev, [w.webhook_id]: w.secret! }))
      }
      setWebhooks(prev => [...prev, w])
    } catch { /* ignore */ } finally { setSavingWebhook(false) }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    await deleteWebhook(webhookId).catch(() => {})
    setWebhooks(prev => prev.filter(w => w.webhook_id !== webhookId))
    setPendingSecrets(prev => { const n = { ...prev }; delete n[webhookId]; return n })
  }

  const handleRotateSecret = async (webhookId: string) => {
    try {
      const w = await rotateWebhookSecret(webhookId)
      if (w.secret) setPendingSecrets(prev => ({ ...prev, [webhookId]: w.secret! }))
    } catch { /* ignore */ }
  }

  const dismissSecret = (webhookId: string) => {
    setPendingSecrets(prev => { const n = { ...prev }; delete n[webhookId]; return n })
  }

  const ROW: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '12px 14px', marginBottom: 8,
  }

  return (
    <div>
      <SectionHeading
        label="AUTOMATION"
        title="Triggers"
        subtitle="Schedule workflows on a cron, or fire them via webhook from any external app."
      />

      {/* Workflow selector */}
      <div className="settings-wf-select" style={{ marginBottom: 20 }}>
        <label style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Select workflow
        </label>
        <select
          value={selectedWfId}
          onChange={e => handleSelectWf(e.target.value)}
          style={{
            ...SANS, fontSize: 14, padding: '10px 14px',
            backgroundColor: 'var(--card-bg)', color: 'var(--text-heading)',
            border: '1px solid var(--border)', borderRadius: 8,
            minWidth: 280, width: '100%', maxWidth: 480, cursor: 'pointer', colorScheme: 'dark light',
            boxSizing: 'border-box',
          }}
        >
          <option value="">— choose a workflow —</option>
          {workflows.map(w => (
            <option key={w.workflow_id} value={w.workflow_id}>{w.name}</option>
          ))}
        </select>
      </div>

      {!selectedWfId && (
        <div style={{
          textAlign: 'center', padding: '40px 0',
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>⚡</div>
          <div style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>Select a workflow to manage its triggers</div>
        </div>
      )}

      {selectedWfId && loadingTriggers && (
        <div style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)', padding: '20px 0' }}>Loading…</div>
      )}

      {selectedWfId && !loadingTriggers && (
        <>
          {/* ── Schedules ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Scheduled Runs
              </span>
              <button
                onClick={() => setShowAddSchedule(o => !o)}
                style={{
                  ...MONO, fontSize: 10, padding: '3px 10px',
                  background: showAddSchedule ? 'var(--bg-hover)' : 'var(--accent)',
                  border: `1px solid ${showAddSchedule ? 'var(--border)' : 'var(--accent)'}`,
                  color: showAddSchedule ? 'var(--text-secondary)' : 'var(--btn-upload-text)',
                  borderRadius: 5, cursor: 'pointer',
                }}
              >{showAddSchedule ? 'Cancel' : '+ Add schedule'}</button>
            </div>

            {showAddSchedule && (
              <div style={{ marginBottom: 10 }}>
                <CronBuilder
                  value={newCronExpr}
                  timezone={newTimezone}
                  onChange={setNewCronExpr}
                  onTimezoneChange={setNewTimezone}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleAddSchedule}
                    disabled={savingSchedule || !newCronExpr.trim()}
                    style={{
                      ...MONO, fontSize: 11, padding: '6px 16px',
                      background: 'var(--accent)', color: 'var(--btn-upload-text)', border: '1px solid var(--accent)',
                      borderRadius: 6, cursor: 'pointer', opacity: savingSchedule ? 0.6 : 1,
                    }}
                  >{savingSchedule ? 'Saving…' : 'Add schedule'}</button>
                  <button
                    onClick={() => { setShowAddSchedule(false); setNewCronExpr(''); setNewTimezone('UTC') }}
                    style={{
                      ...MONO, fontSize: 11, padding: '6px 12px',
                      background: 'none', color: 'var(--text-tertiary)',
                      border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                    }}
                  >Cancel</button>
                </div>
              </div>
            )}

            {schedules.length === 0 && !showAddSchedule && (
              <div style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0' }}>
                No schedules yet.
              </div>
            )}

            {schedules.map(s => (
              <div key={s.trigger_id} style={ROW}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...MONO, fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{s.cron_expr}</span>
                  <span style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {TIMEZONES.find(t => t.value === s.timezone)?.label ?? s.timezone ?? 'UTC'}
                  </span>
                  <span style={{
                    ...MONO, fontSize: 9, padding: '2px 6px', borderRadius: 3,
                    background: s.enabled ? 'var(--accent-soft)' : 'var(--text-tertiary)20',
                    color: s.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
                    border: `1px solid ${s.enabled ? 'var(--blue-border)' : 'var(--text-tertiary)40'}`,
                  }}>{s.enabled ? 'on' : 'off'}</span>
                  {s.last_run_at && (
                    <span style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)' }}>
                      last: {fmtDate(s.last_run_at)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteSchedule(s.trigger_id)}
                    style={{ background: 'none', border: 'none', color: 'var(--invalid)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                  >×</button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Webhooks ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Webhook Triggers
              </span>
              <button
                onClick={handleAddWebhook}
                disabled={savingWebhook}
                style={{
                  ...MONO, fontSize: 10, padding: '3px 10px',
                  background: 'var(--accent)', border: '1px solid var(--accent)',
                  color: 'var(--btn-upload-text)', borderRadius: 5, cursor: 'pointer',
                  opacity: savingWebhook ? 0.6 : 1,
                }}
              >{savingWebhook ? '…' : '+ Add webhook'}</button>
            </div>

            {webhooks.length === 0 && (
              <div style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0' }}>
                No webhooks yet.
              </div>
            )}

            {webhooks.map(w => (
              <div key={w.webhook_id} style={ROW}>
                {/* Webhook header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    ...MONO, fontSize: 9, padding: '2px 6px', borderRadius: 3,
                    background: w.enabled ? 'var(--accent-soft)' : 'var(--text-tertiary)20',
                    color: w.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
                    border: `1px solid ${w.enabled ? 'var(--blue-border)' : 'var(--text-tertiary)40'}`,
                  }}>{w.enabled ? 'on' : 'off'}</span>
                  {w.last_triggered_at && (
                    <span style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)' }}>
                      last: {fmtDate(w.last_triggered_at)}
                    </span>
                  )}
                  <span style={{
                    ...MONO, fontSize: 9, color: 'var(--text-tertiary)', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{BASE_URL}/triggers/webhooks/{w.webhook_id}/trigger</span>
                  <button
                    onClick={() => handleRotateSecret(w.webhook_id)}
                    title="Rotate secret"
                    style={{
                      ...MONO, fontSize: 9, padding: '2px 7px',
                      background: 'none', border: '1px solid var(--border)',
                      color: 'var(--text-tertiary)', borderRadius: 4, cursor: 'pointer',
                    }}
                  >↻ Rotate</button>
                  <button
                    onClick={() => handleDeleteWebhook(w.webhook_id)}
                    style={{ background: 'none', border: 'none', color: 'var(--invalid)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                  >×</button>
                </div>

                {/* API docs + secret reveal */}
                <WebhookApiDocs
                  webhook={w}
                  secret={pendingSecrets[w.webhook_id] ?? null}
                  agentDbInfo={agentDbInfo}
                  onDismissSecret={() => dismissSecret(w.webhook_id)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

