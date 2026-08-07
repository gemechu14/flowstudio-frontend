import { useQueryClient } from '@tanstack/react-query'
import { RunResultPanel } from './RunResultPanel'
import { RunHistoryPanel } from './RunHistoryPanel'
import type { WorkflowRun } from '../api/workflows.api'
import { invalidateDashboardStats } from '../../../shared/api/queryClient'
import { queryKeys } from '../../../shared/api/queryKeys'
import { MONO, SANS, TEAL } from '../lib/workflowsUi'
import { useWorkflowsPageModel } from '../hooks/WorkflowsPageContext'

export function WorkflowRunPanel() {
  const queryClient = useQueryClient()
  const {
    mobileTab, initialInput, setInitialInput, setExpandPageValue, setExpandPage,
    execMode, setExecMode, loopIterations, setLoopIterations,
    convergenceExpr, setConvergenceExpr, enableMemory, setEnableMemory,
    doRun, running, selected, runError, allModes, modeIcons,
    currentRun, selectedHistoryRun, runPanelH, setRunPanelH, runPanelMinH, resizeDragRef,
    setCurrentRun, setSelectedHistoryRun, pollRun,
    runs, runsBusy, selectHistoryRun, nodes,
  } = useWorkflowsPageModel()

  return (
    <>
  {/* Run panel */}
  <div
    className={`wf-run-panel${mobileTab !== 'run' ? ' wf-mobile-hide' : ''}`}
    style={{
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  }}>
    <div className="wf-run-controls" style={{
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <input
        className="wf-run-input"
        value={initialInput}
        onChange={e => setInitialInput(e.target.value)}
        placeholder="Initial prompt / input for the workflow…"
        style={{
          flex: 1, minWidth: 200, fontSize: 13, ...SANS,
          padding: '7px 12px',
          background: 'var(--bg-page)', color: 'var(--text-body)',
          border: '1px solid var(--border)', borderRadius: 6,
        }}
      />
      <button
        onClick={() => { setExpandPageValue(initialInput); setExpandPage({ field: 'initialInput', label: 'Initial Prompt' }) }}
        title="Edit in full view"
        style={{
          ...MONO, fontSize: 11, padding: '6px 10px', flexShrink: 0,
          background: 'var(--bg-page)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', borderRadius: 6, cursor: 'pointer',
        }}
      >↗</button>

      {/* Collaborative iterations pill selector */}
      {execMode === 'collaborative' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)' }}>Max rounds:</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setLoopIterations(n)}
                  style={{
                    ...MONO, fontSize: 11, width: 26, height: 26,
                    background: loopIterations === n ? '#14b8a6' : 'var(--bg-page)',
                    color: loopIterations === n ? '#fff' : 'var(--text-muted)',
                    border: `1px solid ${loopIterations === n ? '#14b8a6' : 'var(--border)'}`,
                    borderRadius: 4, cursor: 'pointer', fontWeight: loopIterations === n ? 700 : 400,
                  }}
                >{n}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Stop when:</span>
            <select
              value={['', 'nonempty'].includes(convergenceExpr) || convergenceExpr.startsWith('contains:') || convergenceExpr.startsWith('startswith:') || convergenceExpr.startsWith('endswith:') || convergenceExpr.startsWith('equals:') || convergenceExpr.startsWith('regex:') ? '' : ''}
              onChange={e => { if (e.target.value) setConvergenceExpr(e.target.value) }}
              style={{
                ...MONO, fontSize: 10, padding: '3px 4px',
                background: 'var(--bg-page)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 4,
              }}
            >
              <option value="">— pick preset —</option>
              <option value="nonempty">nonempty — any output stops the loop</option>
              <option value="contains:APPROVED">contains:APPROVED</option>
              <option value="contains:LGTM">contains:LGTM</option>
              <option value="contains:DONE">contains:DONE</option>
              <option value="contains:PASS">contains:PASS</option>
              <option value="contains:score:9">contains:score:9 — score 9+</option>
              <option value="regex:verdict:\s*yes">regex:verdict:\s*yes</option>
            </select>
            <input
              value={convergenceExpr}
              onChange={e => setConvergenceExpr(e.target.value)}
              placeholder="or type: contains:X  startswith:X  equals:X  regex:X  nonempty"
              style={{
                ...MONO, fontSize: 10, padding: '3px 7px', width: 260,
                background: 'var(--bg-page)', color: 'var(--text-body)',
                border: `1px solid ${convergenceExpr ? TEAL : 'var(--border)'}`,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      )}

      <button
        className="wf-run-btn"
        onClick={doRun}
        disabled={running || !selected}
        style={{
          ...MONO, fontSize: 12, padding: '7px 20px',
          background: running ? '#10B98144' : 'var(--accent)',
          color: 'var(--btn-upload-text)', border: 'none', borderRadius: 6,
          cursor: running ? 'wait' : 'pointer',
          opacity: running || !selected ? 0.7 : 1,
        }}
      >
        {running ? '⟳ Running…' : '▶ Run'}
      </button>
      {runError && (
        <span style={{ ...MONO, fontSize: 11, color: '#EF4444' }}>{runError}</span>
      )}
    </div>

    {/* Mode tabs + notes */}
    <div className="wf-mode-tabs" style={{ padding: '0 20px 10px' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {allModes.map(m => (
          <div key={m} style={{
            ...MONO, fontSize: 10,
            color: execMode === m ? 'var(--accent-text)' : 'var(--text-muted)',
            cursor: 'pointer', padding: '3px 0',
            borderBottom: execMode === m ? '2px solid var(--accent)' : '2px solid transparent',
          }} onClick={() => setExecMode(m)}>
            {modeIcons[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
          </div>
        ))}
        <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {nodes.filter(n => n.agent_id).length}/{nodes.length} nodes assigned
        </span>
      </div>

      {/* Collaborative mode note */}
      {execMode === 'collaborative' && (
        <div style={{
          marginTop: 6, ...MONO, fontSize: 10,
          color: TEAL,
          padding: '3px 8px',
          background: `${TEAL}12`,
          border: `1px solid ${TEAL}30`,
          borderRadius: 4, display: 'inline-block',
        }}>
          Review loop — up to {loopIterations} round{loopIterations !== 1 ? 's' : ''}
          {convergenceExpr ? ` · stops when: ${convergenceExpr}` : ' · runs all rounds'}
        </div>
      )}

      {/* Hybrid mode note */}
      {execMode === 'hybrid' && (
        <div style={{
          marginTop: 6, ...MONO, fontSize: 10,
          color: '#F59E0B',
          padding: '3px 8px',
          background: '#F59E0B12',
          border: '1px solid #F59E0B30',
          borderRadius: 4, display: 'inline-block',
        }}>
          Nodes sharing the same parallel group name will fan-out together
        </div>
      )}

      {/* Persistent memory toggle */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setEnableMemory(v => !v)}
          style={{
            ...MONO, fontSize: 10,
            padding: '3px 10px',
            background: enableMemory ? '#7C3AED22' : 'var(--bg-page)',
            color: enableMemory ? '#7C3AED' : 'var(--text-muted)',
            border: `1px solid ${enableMemory ? '#7C3AED66' : 'var(--border)'}`,
            borderRadius: 4, cursor: 'pointer',
            fontWeight: enableMemory ? 700 : 400,
          }}
        >
          {enableMemory ? '🧠 Memory: ON' : '○ Memory: OFF'}
        </button>
        {enableMemory && (
          <span style={{ ...MONO, fontSize: 10, color: '#7C3AED99' }}>
            Agents summarize each run and remember it next time
          </span>
        )}
      </div>
    </div>
  </div>

  {/* Results — drag-resizable panel */}
  {(currentRun || selectedHistoryRun) && (
    <div className={mobileTab !== 'run' ? 'wf-mobile-hide' : undefined} style={{ flexShrink: 0, position: 'relative' }}>
      {/* Drag handle */}
      <div
        onMouseDown={e => {
          resizeDragRef.current = { startY: e.clientY, startH: runPanelH }
          e.preventDefault()
        }}
        title="Drag to resize · drag down to minimise"
        style={{
          height: 6, cursor: 'ns-resize', background: 'var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--text-muted)', opacity: 0.4 }} />
      </div>
      {/* Panel body — height controlled by drag */}
      <div style={{ height: runPanelH, overflow: 'hidden' }}>
        {runPanelH <= runPanelMinH ? (
          /* Minimised bar */
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 10,
            background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
            cursor: 'pointer',
          }} onClick={() => setRunPanelH(420)}>
            <span style={{ ...MONO, fontSize: 11, color: 'var(--text-muted)' }}>
              Run result — {(currentRun || selectedHistoryRun)!.status}
            </span>
            <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>▲ expand</span>
          </div>
        ) : (
          <RunResultPanel
            run={(currentRun || selectedHistoryRun)!}
            workflowId={selected?.workflow_id ?? ''}
            onClose={() => {
              setCurrentRun(null)
              setSelectedHistoryRun(null)
              setInitialInput('')
            }}
            onResumed={updated => {
              setCurrentRun(updated)
              if (selected) {
                queryClient.setQueryData<WorkflowRun[]>(queryKeys.workflowRuns(selected.workflow_id), (prev = []) =>
                  prev.map(r => r.run_id === updated.run_id ? updated : r)
                )
                pollRun(selected.workflow_id, updated)
              }
            }}
          />
        )}
      </div>
    </div>
  )}

  {/* Mobile / tablet History tab */}
  <div
    className={`wf-mobile-history${mobileTab !== 'history' ? ' wf-mobile-hide' : ''}`}
  >
    {selected ? (
      <RunHistoryPanel
        runs={runs}
        loading={runsBusy}
        onSelectRun={selectHistoryRun}
        selectedRunId={selectedHistoryRun?.run_id}
        workflowId={selected.workflow_id}
        onRunsChanged={() => {
          setSelectedHistoryRun(null)
          setCurrentRun(null)
          setInitialInput('')
          queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns(selected.workflow_id) })
          invalidateDashboardStats()
        }}
      />
    ) : (
      <div style={{
        padding: 24, textAlign: 'center', color: 'var(--text-muted)',
        ...SANS, fontSize: 13,
      }}>
        Save the workflow to view run history.
      </div>
    )}
  </div>
    </>
  )
}
