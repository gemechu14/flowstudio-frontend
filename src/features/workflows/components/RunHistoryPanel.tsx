import { useState, type MouseEvent } from 'react'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import type { WorkflowRun } from '../api/workflows.api'
import { deleteRun, clearAllRuns } from '../api/workflows.api'
import { SANS, fmt, elapsed, formatTokens, modeShort } from '../lib/workflowsUi'
import { Bone } from './WorkflowsSkeleton'

function RunHistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading run history" style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => {
        const base = i * 0.06
        return (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--skeleton-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Bone h={16} w={84} r={999} delay={base} />
              <Bone h={11} w={56} delay={base + 0.04} style={{ marginLeft: 'auto' }} />
            </div>
            <Bone h={13} w="90%" delay={base + 0.06} style={{ marginBottom: 8 }} />
            <Bone h={11} w="70%" delay={base + 0.1} />
          </div>
        )
      })}
    </div>
  )
}

export function RunHistoryPanel({
  runs, onSelectRun, selectedRunId, workflowId, onRunsChanged, loading = false,
}: {
  runs: WorkflowRun[]
  onSelectRun: (r: WorkflowRun) => void
  selectedRunId?: string
  workflowId: string
  onRunsChanged: () => void
  loading?: boolean
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null)

  const statusMeta = (s: string) => {
    if (s === 'completed') return { color: 'var(--accent-text)', bg: 'transparent', icon: '✓', label: 'COMPLETED', bare: true }
    if (s === 'running') return { color: 'var(--accent-text)', bg: 'var(--accent-soft)', icon: '◌', label: 'RUNNING', bare: false }
    if (s === 'awaiting_checkpoint') return { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.12)', icon: '⏸', label: 'CHECKPOINT', bare: false }
    return { color: 'var(--invalid)', bg: 'var(--invalid-dim)', icon: '✗', label: 'FAILED', bare: false }
  }

  const requestDeleteRun = (e: MouseEvent, runId: string) => {
    e.stopPropagation()
    setDeleteRunId(runId)
  }

  const confirmDeleteRun = async () => {
    if (!deleteRunId) return
    const runId = deleteRunId
    setDeleteRunId(null)
    await deleteRun(workflowId, runId)
    onRunsChanged()
  }

  const confirmClearAll = async () => {
    setShowClearConfirm(false)
    await clearAllRuns(workflowId)
    onRunsChanged()
  }

  return (
    <div className="wf-run-history-inner">
      <div style={{
        padding: '10px 14px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          ...SANS, fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Run History
        </span>
        {!loading && runs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            style={{
              ...SANS, fontSize: 12, fontWeight: 500, padding: 0,
              background: 'none', border: 'none',
              color: 'var(--invalid)', cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <RunHistorySkeleton />
      ) : runs.length === 0 ? (
        <div style={{
          padding: '16px 14px', color: 'var(--text-muted)', fontSize: 12,
          textAlign: 'center', ...SANS,
        }}>
          No runs yet
        </div>
      ) : (
      <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {runs.map(run => {
          const active = selectedRunId === run.run_id
          const meta = statusMeta(run.status)
          const duration = elapsed(run.started_at, run.completed_at)
          const tokens = run.total_input_tokens + run.total_output_tokens
          return (
            <div
              key={run.run_id}
              className={`wf-run-item${active ? ' is-active' : ''}`}
              onClick={() => onSelectRun(run)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: 10,
                border: active ? '1px solid var(--blue-border)' : '1px solid transparent',
                background: active ? 'var(--accent-soft)' : 'transparent',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  ...SANS, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                  padding: meta.bare ? 0 : '3px 8px', borderRadius: meta.bare ? 0 : 999,
                  background: meta.bg, color: meta.color,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <span aria-hidden>{meta.icon}</span>
                  {meta.label}
                </span>
                <span style={{
                  ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatTokens(tokens)} tok
                </span>
                <button
                  type="button"
                  onClick={e => requestDeleteRun(e, run.run_id)}
                  title="Delete this run"
                  className="wf-run-delete"
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
                    lineHeight: 1, padding: '0 2px', opacity: 0.55,
                  }}
                >×</button>
              </div>

              {run.initial_input ? (
                <div style={{
                  ...SANS, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 6, lineHeight: 1.35,
                }}>
                  {run.initial_input}
                </div>
              ) : (
                <div style={{
                  ...SANS, fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)',
                  marginBottom: 6, fontStyle: 'italic',
                }}>
                  (no input)
                </div>
              )}

              <div style={{
                ...SANS, fontSize: 11, color: 'var(--text-tertiary)',
                display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'center',
              }}>
                <span>{fmt(run.started_at)}</span>
                {duration && (
                  <>
                    <span style={{ margin: '0 6px', opacity: 0.55 }}>·</span>
                    <span>{duration}</span>
                  </>
                )}
                <span style={{ margin: '0 6px', opacity: 0.55 }}>·</span>
                <span>{modeShort(run.execution_mode)}</span>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {showClearConfirm && (
        <ConfirmModal
          message="Are you sure you want to clear all run history and agent memory for this workflow? This action cannot be undone."
          confirmLabel="Clear All"
          onConfirm={confirmClearAll}
          onClose={() => setShowClearConfirm(false)}
        />
      )}

      {deleteRunId && (
        <ConfirmModal
          message="Are you sure you want to delete this run? This action cannot be undone."
          confirmLabel="Delete Run"
          onConfirm={confirmDeleteRun}
          onClose={() => setDeleteRunId(null)}
        />
      )}
    </div>
  )
}
