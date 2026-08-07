import { useState, useEffect } from 'react'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import type { WorkflowRun, NodeRunResult, CheckpointInfo } from '../api/workflows.api'
import { getCheckpoint, resumeRun } from '../api/workflows.api'
import { AgentInspector } from './AgentInspector'
import { StatusPill } from './StatusPill'
import { MONO, SANS, elapsed, elapsedSec, formatTokens } from '../lib/workflowsUi'

export function RunResultPanel({
  run, workflowId, onClose, onResumed,
}: {
  run: WorkflowRun
  workflowId: string
  onClose: () => void
  onResumed: (updated: WorkflowRun) => void
}) {
  const [checkpoint, setCheckpoint] = useState<CheckpointInfo | null>(null)
  const [humanInput, setHumanInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [runnerExpand, setRunnerExpand] = useState<{ label: string; value: string } | null>(null)
  const [expandCopied, setExpandCopied] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)
  const [inspect, setInspect] = useState<{ nodeId: string; tab: 'system' | 'input' | 'output' } | null>(null)

  useEffect(() => {
    if (run.status === 'awaiting_checkpoint') {
      getCheckpoint(workflowId, run.run_id)
        .then(cp => { if (cp.status === 'awaiting') setCheckpoint(cp) })
        .catch(() => {})
    } else {
      setCheckpoint(null)
    }
  }, [run.status, run.run_id, workflowId])

  useEffect(() => {
    setInspect(null)
  }, [run.run_id])

  const doResume = async () => {
    setShowEmptyConfirm(false)
    setSubmitting(true)
    try {
      const updated = await resumeRun(workflowId, run.run_id, humanInput || 'APPROVE')
      setHumanInput('')
      setCheckpoint(null)
      onResumed(updated)
    } catch (e: any) {
      setResumeError(e.message || String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResume = () => {
    if (!humanInput.trim()) { setShowEmptyConfirm(true); return }
    doResume()
  }

  const openInspect = (nr: NodeRunResult, tab: 'system' | 'input' | 'output') => {
    setInspect({ nodeId: nr.node_id, tab })
  }

  const inspectingNr = inspect
    ? run.node_results.find(n => n.node_id === inspect.nodeId) ?? null
    : null

  const expandLineCount = runnerExpand?.value ? runnerExpand.value.split('\n').length : 0

  const copyExpanded = async () => {
    if (!runnerExpand) return
    try {
      await navigator.clipboard.writeText(runnerExpand.value)
      setExpandCopied(true)
      setTimeout(() => setExpandCopied(false), 1200)
    } catch { /* ignore */ }
  }

  const closeExpand = () => {
    setRunnerExpand(null)
    setExpandCopied(false)
  }

  const expandModal = runnerExpand ? (
    <div
      onClick={closeExpand}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(8,12,24,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 24,
        ...SANS,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={runnerExpand.label}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          width: 820, maxWidth: '100%',
          maxHeight: 'min(88vh, 900px)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              ...MONO, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)', marginBottom: 4,
            }}>
              Expanded view
            </div>
            <div style={{
              ...MONO, fontSize: 14, fontWeight: 700, color: 'var(--text-heading)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {runnerExpand.label}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={copyExpanded}
              title={expandCopied ? 'Copied' : 'Copy'}
              aria-label={expandCopied ? 'Copied' : 'Copy'}
              style={{
                width: 34, height: 34, padding: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: expandCopied ? 'var(--accent-soft)' : 'var(--bg-hover)',
                border: `1px solid ${expandCopied ? 'var(--blue-border)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer',
                color: expandCopied ? 'var(--accent-text)' : 'var(--text-secondary)',
              }}
            >
              {expandCopied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={closeExpand}
              style={{
                ...SANS,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-secondary)',
                cursor: 'pointer', padding: '6px 10px', fontSize: 12,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{
          padding: '10px 22px',
          display: 'flex', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{
            ...MONO, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {expandLineCount} lines
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 22px 22px' }}>
          <pre style={{
            ...MONO, fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)',
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 18px', minHeight: '100%',
          }}>
            {runnerExpand.value || '—'}
          </pre>
        </div>
      </div>
    </div>
  ) : null

  const totalTokens = run.total_input_tokens + run.total_output_tokens
  const runDuration = elapsed(run.started_at, run.completed_at)

  return (
    <>
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-card)',
      maxHeight: 420,
      overflow: 'auto',
    }}>
      <div style={{
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        position: 'sticky', top: 0, background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)', zIndex: 1,
      }}>
        <span style={{ ...SANS, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Run result
        </span>
        <StatusPill status={run.status} />
        {runDuration && (
          <span style={{
            ...SANS, fontSize: 12, color: 'var(--text-tertiary)',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
            {runDuration}
          </span>
        )}
        <span style={{
          ...SANS, fontSize: 12, color: 'var(--text-tertiary)',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3z" strokeLinejoin="round" />
          </svg>
          {formatTokens(totalTokens)} tok
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            ...SANS, fontSize: 12, fontWeight: 500, marginLeft: 'auto',
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 2px',
          }}
        >
          Collapse
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* HITL checkpoint panel */}
      {run.status === 'awaiting_checkpoint' && (
        <div style={{
          margin: '12px 20px',
          padding: '12px 14px',
          background: '#7C3AED12',
          border: '1px solid #7C3AED44',
          borderRadius: 8,
        }}>
          <div style={{ fontWeight: 700, color: '#7C3AED', fontSize: 12, marginBottom: 6 }}>
            ⏸ Human checkpoint — {checkpoint?.node_label || 'waiting…'}
          </div>
          {checkpoint?.checkpoint_prompt && (
            <div style={{ ...MONO, fontSize: 11, color: 'var(--text-body)', marginBottom: 8, lineHeight: 1.5 }}>
              {checkpoint.checkpoint_prompt}
            </div>
          )}
          {checkpoint?.prior_output && (
            <div style={{
              ...MONO, fontSize: 11, color: 'var(--text-muted)',
              background: 'var(--bg-page)', padding: '8px 10px',
              borderRadius: 6, border: '1px solid var(--border)',
              whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', marginBottom: 8,
            }}>
              {checkpoint.prior_output}
            </div>
          )}
          <textarea
            value={humanInput}
            onChange={e => setHumanInput(e.target.value)}
            placeholder="Type APPROVE to accept the output above, or enter your own text to override it…"
            rows={3}
            style={{
              width: '100%', ...MONO, fontSize: 11,
              padding: '8px 10px', borderRadius: 6,
              background: 'var(--bg-page)', color: 'var(--text-body)',
              border: '1px solid #7C3AED66',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleResume}
            disabled={submitting}
            style={{
              marginTop: 6, ...MONO, fontSize: 11, padding: '6px 16px',
              background: submitting ? '#7C3AED44' : '#7C3AED',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting ? 'Submitting…' : '▶ Resume workflow'}
          </button>
          {resumeError && (
            <span style={{ ...MONO, fontSize: 11, color: '#EF4444', marginTop: 4, display: 'block' }}>{resumeError}</span>
          )}
        </div>
      )}

      {/* Node results table */}
      <div style={{ overflowX: 'auto' }}>
        <div
          className="wf-run-result-table"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(160px, 1.6fr) 120px 72px 88px 110px',
            minWidth: 560,
            ...SANS,
          }}
        >
          {['AGENT', 'STATUS', 'TIME', 'TOKENS', 'VIEW'].map(h => (
            <div
              key={h}
              style={{
                padding: '10px 16px',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
                borderBottom: '1px solid var(--border)',
                textAlign: h === 'VIEW' ? 'right' : 'left',
              }}
            >
              {h}
            </div>
          ))}

          {run.node_results.map(nr => {
            const active = inspect?.nodeId === nr.node_id
            return (
              <div
                key={nr.result_id || nr.node_id}
                style={{ display: 'contents' }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openInspect(nr, 'system')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInspect(nr, 'system') } }}
                  title="Open system prompt"
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" aria-hidden style={{ flexShrink: 0 }}>
                    <path d="M12 2l1.8 5.6L20 9.4l-4.6 3.4L16.8 19 12 15.8 7.2 19l1.4-6.2L4 9.4l6.2-1.8L12 2z" />
                  </svg>
                  <span style={{
                    ...MONO, fontSize: 12,
                    color: active && inspect?.tab === 'system' ? 'var(--accent-text)' : 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {nr.node_label || nr.node_id}
                  </span>
                </div>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                  <StatusPill status={nr.status} />
                </div>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  ...MONO, fontSize: 12, color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                  {elapsedSec(nr.started_at, nr.completed_at)}
                </div>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  ...MONO, fontSize: 12, color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                  {formatTokens(nr.input_tokens + nr.output_tokens)}
                </div>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                  <button
                    type="button"
                    onClick={() => openInspect(nr, 'input')}
                    style={{
                      ...SANS, fontSize: 12, fontWeight: 500, padding: 0,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: inspect?.nodeId === nr.node_id && inspect.tab === 'input'
                        ? 'var(--accent-text)' : 'var(--text-secondary)',
                    }}
                  >
                    input
                  </button>
                  <button
                    type="button"
                    onClick={() => openInspect(nr, 'output')}
                    style={{
                      ...SANS, fontSize: 12, fontWeight: 500, padding: 0,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: inspect?.nodeId === nr.node_id && inspect.tab === 'output'
                        ? 'var(--accent-text)' : 'var(--text-secondary)',
                    }}
                  >
                    output
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Final output */}
      {run.final_output && (
        <div style={{ padding: '12px 20px' }}>
          <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            FINAL OUTPUT
            <button onClick={() => setRunnerExpand({ label: 'Final Output', value: run.final_output })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: 0, lineHeight: 1 }}>↗</button>
          </div>
          <div style={{
            ...MONO, fontSize: 11, color: 'var(--text-body)',
            background: 'var(--bg-page)', padding: '10px 12px',
            borderRadius: 6, border: '1px solid var(--border)',
            whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto',
          }}>
            {run.final_output}
          </div>
        </div>
      )}

      {/* Shared Blackboard — only rendered when agents have written to it */}
      {run.blackboard && Object.keys(run.blackboard).length > 0 && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            ...MONO, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
            marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Shared Blackboard
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(run.blackboard).map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: 'var(--accent-soft)',
                border: '1px solid var(--blue-border)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                <span style={{
                  ...MONO, fontSize: 11, color: 'var(--accent-text)',
                  fontWeight: 700, flexShrink: 0,
                }}>
                  {k}
                </span>
                <span style={{
                  ...MONO, fontSize: 11, color: 'var(--text-primary)',
                  flex: 1, wordBreak: 'break-word', lineHeight: 1.45,
                }}>
                  {typeof v === 'string' ? v : JSON.stringify(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

      {inspectingNr && inspect && (
        <AgentInspector
          nr={inspectingNr}
          tab={inspect.tab}
          onTabChange={tab => setInspect({ nodeId: inspect.nodeId, tab })}
          onClose={() => setInspect(null)}
          onExpand={(label, value) => setRunnerExpand({ label, value })}
        />
      )}

      {expandModal}

      {showEmptyConfirm && (
        <ConfirmModal
          message="No input provided. Submit anyway and let the agent decide how to proceed?"
          confirmLabel="Submit"
          confirmColor="#7C3AED"
          onConfirm={doResume}
          onClose={() => setShowEmptyConfirm(false)}
        />
      )}
    </>
  )
}

