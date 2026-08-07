import { useQueryClient } from '@tanstack/react-query'
import type { ExecutionMode } from '../api/workflows.api'
import { RunHistoryPanel } from './RunHistoryPanel'
import { WorkflowsListSkeleton } from './WorkflowsSkeleton'
import { invalidateDashboardStats } from '../../../shared/api/queryClient'
import { queryKeys } from '../../../shared/api/queryKeys'
import { SANS, modeShort, relativeTime } from '../lib/workflowsUi'
import { useWorkflowsPageModel } from '../hooks/WorkflowsPageContext'

export function WorkflowsListPane() {
  const queryClient = useQueryClient()
  const {
    wfSearch, setWfSearch, wfModeFilter, setWfModeFilter,
    workflows, loading, selected, loadWorkflow, openMobileDetail, newWorkflow,
    runs, runsBusy, selectHistoryRun, selectedHistoryRun, setSelectedHistoryRun,
    setCurrentRun, setInitialInput,
  } = useWorkflowsPageModel()

  return (
  <div
    className="wf-list-pane"
    style={{
    width: 260, flexShrink: 0,
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    background: 'var(--bg-card)',
  }}>
    <div className="wf-list-header" style={{
      padding: '16px 16px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{ ...SANS, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Workflows</span>
      <button
        className="wf-new-btn"
        onClick={newWorkflow}
        style={{
          ...SANS, fontSize: 12, padding: '6px 12px', fontWeight: 600,
          background: 'var(--accent)', border: 'none',
          color: '#FFFFFF', borderRadius: 8, cursor: 'pointer',
        }}
      >New</button>
    </div>

    {/* Search + mode filter */}
    <div className="wf-list-filters" style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="wf-search-wrap" style={{ position: 'relative' }}>
        <svg
          className="wf-search-icon"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          className="wf-search-input"
          value={wfSearch}
          onChange={e => setWfSearch(e.target.value)}
          placeholder="Search workflows…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px 8px 36px', fontSize: 12, ...SANS,
            background: 'var(--bg-page)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
          }}
        />
      </div>
      <select
        value={wfModeFilter}
        onChange={e => setWfModeFilter(e.target.value as ExecutionMode | '')}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '7px 10px', fontSize: 12, ...SANS,
          background: 'var(--bg-page)', color: 'var(--text-secondary)',
          border: '1px solid var(--border)', borderRadius: 8, outline: 'none', cursor: 'pointer',
        }}
      >
        <option value="">All modes</option>
        <option value="sequential">Sequential</option>
        <option value="parallel">Parallel</option>
        <option value="hierarchical">Hierarchical</option>
        <option value="hybrid">Hybrid</option>
        <option value="collaborative">Collaborative</option>
        <option value="event_driven">Event driven</option>
      </select>
    </div>

    <div className="wf-list-scroll" style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '0 8px 8px' }}>
      {loading ? (
        <WorkflowsListSkeleton />
      ) : (
        workflows
          .filter(wf =>
            (!wfSearch || wf.name.toLowerCase().includes(wfSearch.toLowerCase())) &&
            (!wfModeFilter || wf.execution_mode === wfModeFilter)
          )
          .map(wf => {
            const active = selected?.workflow_id === wf.workflow_id
            const nodeCount = wf.nodes?.length || wf.steps?.length || 0
            return (
          <div
            key={wf.workflow_id}
            className={`wf-list-item${active ? ' is-active' : ''}`}
            onClick={() => { loadWorkflow(wf); openMobileDetail('canvas') }}
            style={{
              padding: '12px 12px',
              cursor: 'pointer',
              marginBottom: 4,
              borderRadius: 10,
              border: active ? '1px solid var(--blue-border)' : '1px solid transparent',
              background: active ? 'var(--accent-soft)' : 'transparent',
              boxShadow: active ? 'none' : undefined,
            }}
          >
            <div style={{
              ...SANS, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              marginBottom: wf.description ? 4 : 8, lineHeight: 1.35,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {wf.name}
            </div>
            {wf.description ? (
              <div style={{
                ...SANS, fontSize: 12, color: 'var(--text-secondary)',
                marginBottom: 8, lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {wf.description}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
              <span style={{
                ...SANS, fontSize: 11, fontWeight: 500,
                padding: '2px 8px', borderRadius: 999,
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                flexShrink: 0,
              }}>
                {modeShort(wf.execution_mode)}
              </span>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {nodeCount} nodes
              </span>
              <span style={{
                ...SANS, fontSize: 11, color: 'var(--text-tertiary)',
                marginLeft: 'auto', flexShrink: 0,
              }}>
                {relativeTime(wf.updated_at || wf.created_at)}
              </span>
            </div>
          </div>
            )
          })
      )}
    </div>

    {/* Run history in left panel */}
    {selected && (
      <div className="wf-run-history" style={{
        borderTop: '1px solid var(--border)',
        maxHeight: '42%',
        minHeight: 160,
        overflow: 'auto',
        background: 'var(--bg-card)',
      }}>
        <RunHistoryPanel
          runs={runs}
          loading={runsBusy}
          onSelectRun={selectHistoryRun}
          selectedRunId={selectedHistoryRun?.run_id}
          workflowId={selected?.workflow_id ?? ''}
          onRunsChanged={() => {
            setSelectedHistoryRun(null)
            setCurrentRun(null)
            setInitialInput('')
            if (selected) {
              queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns(selected.workflow_id) })
            }
            invalidateDashboardStats()
          }}
        />
      </div>
    )}
  </div>
  )
}
