import { useState, useEffect } from 'react'
import { BASE_URL } from '../../../shared/api/client'
import {
  type ScheduleTrigger, type WebhookTrigger,
  listSchedules, createSchedule, deleteSchedule,
  listWebhooks, createWebhook, deleteWebhook,
} from '../api/workflows.api'
import { MONO, fmt } from '../lib/workflowsUi'

export function TriggersPanel({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
  const [schedules, setSchedules] = useState<ScheduleTrigger[]>([])
  const [webhooks, setWebhooks] = useState<WebhookTrigger[]>([])
  const [loadingTriggers, setLoadingTriggers] = useState(true)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [newCronExpr, setNewCronExpr] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    setLoadingTriggers(true)
    Promise.all([
      listSchedules(workflowId).catch(() => [] as ScheduleTrigger[]),
      listWebhooks(workflowId).catch(() => [] as WebhookTrigger[]),
    ]).then(([s, w]) => {
      setSchedules(s)
      setWebhooks(w)
    }).finally(() => setLoadingTriggers(false))
  }, [workflowId])

  const handleAddSchedule = async () => {
    if (!newCronExpr.trim()) return
    setSavingSchedule(true)
    try {
      const s = await createSchedule(workflowId, newCronExpr.trim())
      setSchedules(prev => [...prev, s])
      setNewCronExpr('')
      setShowAddSchedule(false)
    } catch { /* ignore */ } finally { setSavingSchedule(false) }
  }

  const handleDeleteSchedule = async (triggerId: string) => {
    await deleteSchedule(triggerId).catch(() => {})
    setSchedules(prev => prev.filter(s => s.trigger_id !== triggerId))
  }

  const handleAddWebhook = async () => {
    setSavingWebhook(true)
    try {
      const w = await createWebhook(workflowId)
      setWebhooks(prev => [...prev, w])
    } catch { /* ignore */ } finally { setSavingWebhook(false) }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    await deleteWebhook(webhookId).catch(() => {})
    setWebhooks(prev => prev.filter(w => w.webhook_id !== webhookId))
  }

  const webhookUrl = (id: string) =>
    `${BASE_URL}/triggers/webhooks/${encodeURIComponent(id)}/trigger`

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    }).catch(() => {})
  }

  return (
    <div style={{
      position: 'absolute', top: 44, right: 0, zIndex: 50,
      width: 360, background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-page)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-heading)', ...MONO }}>
          Triggers
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}
        >×</button>
      </div>

      <div style={{ maxHeight: 460, overflow: 'auto' }}>
        {loadingTriggers ? (
          <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>
        ) : (
          <>
            {/* Schedules section */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Schedules
                </span>
                <button
                  onClick={() => setShowAddSchedule(!showAddSchedule)}
                  style={{
                    ...MONO, fontSize: 10, padding: '2px 8px',
                    background: 'var(--accent-soft)', border: '1px solid var(--blue-border)',
                    color: 'var(--accent-text)', borderRadius: 4, cursor: 'pointer',
                  }}
                >+ Add schedule</button>
              </div>

              {schedules.length === 0 && !showAddSchedule && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No schedules yet</div>
              )}

              {schedules.map(s => (
                <div key={s.trigger_id} style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                  background: 'var(--bg-page)', borderRadius: 5, padding: '5px 8px',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ ...MONO, fontSize: 11, color: 'var(--text-body)', flex: 1 }}>{s.cron_expr}</span>
                  <span style={{
                    ...MONO, fontSize: 9, padding: '1px 5px', borderRadius: 3,
                    background: s.enabled ? '#10B98120' : '#6B728020',
                    color: s.enabled ? '#10B981' : '#6B7280',
                    border: `1px solid ${s.enabled ? '#10B98140' : '#6B728040'}`,
                  }}>{s.enabled ? 'on' : 'off'}</span>
                  {s.last_run_at && (
                    <span style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)' }}>
                      {fmt(s.last_run_at)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteSchedule(s.trigger_id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}
                  >×</button>
                </div>
              ))}

              {showAddSchedule && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input
                    value={newCronExpr}
                    onChange={e => setNewCronExpr(e.target.value)}
                    placeholder="0 9 * * 1-5"
                    style={{
                      flex: 1, ...MONO, fontSize: 11, padding: '4px 8px',
                      background: 'var(--bg-page)', color: 'var(--text-body)',
                      border: '1px solid var(--border)', borderRadius: 5,
                    }}
                  />
                  <button
                    onClick={handleAddSchedule}
                    disabled={savingSchedule || !newCronExpr.trim()}
                    style={{
                      ...MONO, fontSize: 10, padding: '4px 10px',
                      background: 'var(--accent)', color: 'var(--btn-upload-text)', border: 'none',
                      borderRadius: 5, cursor: 'pointer', opacity: savingSchedule ? 0.6 : 1,
                    }}
                  >{savingSchedule ? '…' : 'Add'}</button>
                  <button
                    onClick={() => { setShowAddSchedule(false); setNewCronExpr('') }}
                    style={{
                      ...MONO, fontSize: 10, padding: '4px 8px',
                      background: 'var(--bg-page)', color: 'var(--text-muted)',
                      border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer',
                    }}
                  >Cancel</button>
                </div>
              )}
            </div>

            {/* Webhooks section */}
            <div style={{ padding: '10px 14px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Webhooks
                </span>
                <button
                  onClick={handleAddWebhook}
                  disabled={savingWebhook}
                  style={{
                    ...MONO, fontSize: 10, padding: '2px 8px',
                    background: '#7C3AED22', border: '1px solid #7C3AED44',
                    color: '#7C3AED', borderRadius: 4, cursor: 'pointer',
                    opacity: savingWebhook ? 0.6 : 1,
                  }}
                >{savingWebhook ? '…' : '+ Add webhook'}</button>
              </div>

              {webhooks.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No webhooks yet</div>
              )}

              {webhooks.map(w => {
                const url = webhookUrl(w.webhook_id)
                return (
                  <div key={w.webhook_id} style={{
                    marginBottom: 6,
                    background: 'var(--bg-page)', borderRadius: 5, padding: '7px 8px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        ...MONO, fontSize: 9, padding: '1px 5px', borderRadius: 3,
                        background: w.enabled ? '#10B98120' : '#6B728020',
                        color: w.enabled ? '#10B981' : '#6B7280',
                        border: `1px solid ${w.enabled ? '#10B98140' : '#6B728040'}`,
                      }}>{w.enabled ? 'on' : 'off'}</span>
                      {w.last_triggered_at && (
                        <span style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)' }}>
                          last: {fmt(w.last_triggered_at)}
                        </span>
                      )}
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={() => handleDeleteWebhook(w.webhook_id)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}
                      >×</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        ...MONO, fontSize: 9, color: 'var(--text-muted)', flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{url}</span>
                      <button
                        onClick={() => copyToClipboard(url, w.webhook_id)}
                        style={{
                          ...MONO, fontSize: 9, padding: '2px 7px', flexShrink: 0,
                          background: copiedId === w.webhook_id ? '#10B98122' : 'var(--bg-card)',
                          border: `1px solid ${copiedId === w.webhook_id ? '#10B98144' : 'var(--border)'}`,
                          color: copiedId === w.webhook_id ? '#10B981' : 'var(--text-muted)',
                          borderRadius: 4, cursor: 'pointer',
                        }}
                      >{copiedId === w.webhook_id ? 'Copied' : 'Copy'}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

