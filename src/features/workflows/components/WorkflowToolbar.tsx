import type { ExecutionMode } from '../api/workflows.api'
import { MONO, SANS, MODE_LABELS } from '../lib/workflowsUi'
import { useWorkflowsPageModel } from '../hooks/WorkflowsPageContext'

export function WorkflowToolbar() {
  const {
    selected, setMobileShowDetail, mobileTab, setMobileTab,
    wfName, setWfName, wfDesc, setWfDesc, setExpandPage, setExpandPageValue,
    execMode, setExecMode, nodes, connectingFrom,
    doDeleteWorkflow, saveWorkflow, saving,
    addNode, autoLayout, zoom, zoomIn, zoomOut, zoomReset,
    modeIcons,
  } = useWorkflowsPageModel()

  return (
  <>
  {/* Toolbar */}
  <div className="wf-toolbar" style={{
    padding: 0,
    borderBottom: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    background: 'var(--bg-card)',
    flexShrink: 0,
  }}>
    {/* Row 1 — identity + mode / delete / save */}
    <div className="wf-toolbar-top" style={{
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
    }}>
      <button
        type="button"
        className="wf-back"
        onClick={() => setMobileShowDetail(false)}
        style={{
          display: 'none',
          alignItems: 'center',
          gap: 6,
          ...SANS,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent-text)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          width: '100%',
          flexBasis: '100%',
        }}
      >
        <span aria-hidden>‹</span> All workflows
      </button>

      <div className="wf-toolbar-identity" style={{
        flex: 1, minWidth: 180,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <input
          className="wf-name-input"
          value={wfName}
          onChange={e => setWfName(e.target.value)}
          placeholder="Workflow name"
          style={{
            ...SANS, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
            background: 'transparent', border: 'none', outline: 'none',
            minWidth: 140, flex: '0 1 auto', padding: 0,
          }}
        />
        <span style={{
          ...SANS, fontSize: 11, fontWeight: 500, flexShrink: 0,
          padding: '2px 8px', borderRadius: 999,
          background: 'var(--bg-hover)', color: 'var(--text-tertiary)',
          border: '1px solid var(--border)',
        }}>
          {nodes.length} nodes
        </span>
        <span className="wf-toolbar-sep" style={{ color: 'var(--border)', fontSize: 16, flexShrink: 0 }} aria-hidden>|</span>
        <input
          className="wf-desc-input"
          value={wfDesc}
          onChange={e => setWfDesc(e.target.value)}
          placeholder="Description (optional)"
          style={{
            ...SANS, fontSize: 13, color: 'var(--text-secondary)',
            background: 'transparent', border: 'none', outline: 'none',
            minWidth: 140, flex: 1, padding: 0,
          }}
        />
        <button
          type="button"
          onClick={() => { setExpandPageValue(wfDesc); setExpandPage({ field: 'wfDesc', label: 'Workflow Description' }) }}
          title="Edit in full view"
          style={{
            ...SANS, fontSize: 11, padding: '2px 6px', flexShrink: 0,
            background: 'var(--bg-hover)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', borderRadius: 6, cursor: 'pointer',
          }}
        >↗</button>
      </div>

      <div className="wf-toolbar-actions" style={{
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto',
      }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          <span style={{
            position: 'absolute', left: 10, pointerEvents: 'none',
            color: 'var(--accent-text)', fontSize: 13, lineHeight: 1,
          }}>
            {modeIcons[execMode]}
          </span>
          <select
            value={execMode}
            onChange={e => setExecMode(e.target.value as ExecutionMode)}
            title={MODE_LABELS[execMode]}
            style={{
              ...SANS, fontSize: 12, fontWeight: 500,
              padding: '7px 28px 7px 28px',
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 8,
              cursor: 'pointer', outline: 'none', appearance: 'none',
              WebkitAppearance: 'none', width: 248,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {(Object.entries(MODE_LABELS) as [ExecutionMode, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={`wf-delete-btn${!selected ? ' is-placeholder' : ''}`}
          disabled={!selected}
          onClick={() => { if (selected) doDeleteWorkflow(selected.workflow_id) }}
          style={{
            ...SANS, fontSize: 13, fontWeight: 500,
            padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'var(--invalid-dim)', color: 'var(--invalid)',
            border: '1px solid rgba(239, 68, 68, 0.28)', borderRadius: 10,
            cursor: selected ? 'pointer' : 'default',
            visibility: selected ? 'visible' : 'hidden',
            pointerEvents: selected ? 'auto' : 'none',
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M9 4h6M10 4V3h4v1M5 7h14M8 7l.8 12.5a1.5 1.5 0 0 0 1.5 1.5h3.4a1.5 1.5 0 0 0 1.5-1.5L16 7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.5 11v5.5M13.5 11v5.5" strokeLinecap="round" />
          </svg>
          Delete
        </button>

        <button
          type="button"
          className="wf-save-btn"
          onClick={saveWorkflow}
          disabled={saving}
          style={{
            ...SANS, fontSize: 13, fontWeight: 600,
            padding: '7px 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'var(--accent)', color: '#FFFFFF',
            border: 'none', borderRadius: 8, cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
            minWidth: 108, flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 3h11l3 3v15H5V3z" strokeLinejoin="round" />
            <path d="M8 3v6h8V3M8 21v-7h8v7" strokeLinejoin="round" />
          </svg>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>

    {/* Mobile / tablet detail tabs */}
    <div className="wf-mobile-tabs" role="tablist" aria-label="Workflow sections">
      {([
        { id: 'canvas' as const, label: 'Canvas' },
        { id: 'run' as const, label: 'Run Result' },
        { id: 'history' as const, label: 'History' },
      ]).map(t => {
        const active = mobileTab === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`wf-mobile-tab${active ? ' is-active' : ''}`}
            onClick={() => setMobileTab(t.id)}
          >
            {t.id === 'history' && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
            )}
            {t.label}
          </button>
        )
      })}
    </div>

    {/* Row 2 — ADD tools left, auto layout + zoom right */}
    <div className={`wf-toolbar-bottom${mobileTab !== 'canvas' ? ' wf-mobile-hide' : ''}`} style={{
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, flexWrap: 'wrap',
      }}>
        <span style={{
          ...SANS, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 2,
        }}>
          Add
        </span>
        {([
          { type: 'agent', label: 'Agent', show: true },
          { type: 'orchestrator', label: 'Orchestrator', show: execMode === 'hierarchical' || execMode === 'hybrid' },
          { type: 'fan_out', label: 'Fan-out', show: execMode === 'hybrid' },
          { type: 'loop', label: 'Loop', show: execMode === 'hybrid' },
          { type: 'condition', label: 'Condition', show: execMode === 'hybrid' },
          { type: 'switch', label: 'Switch', show: execMode === 'hybrid' },
          { type: 'subworkflow', label: 'Sub-flow', show: execMode === 'hybrid' },
          { type: 'collaborative_node', label: 'Collab', show: execMode === 'hybrid' },
        ] as const).filter(b => b.show).map(b => (
          <button
            key={b.type}
            type="button"
            onClick={() => addNode(b.type)}
            style={{
              ...MONO, fontSize: 11, fontWeight: 500,
              padding: '6px 10px',
              background: 'var(--accent-soft)',
              color: 'var(--text-primary)',
              border: '1px solid transparent',
              borderRadius: 8, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ color: 'var(--accent-text)', fontWeight: 700 }}>+</span>
            {b.label}
          </button>
        ))}

        {connectingFrom && (
          <span style={{
            ...SANS, fontSize: 11, color: '#F59E0B',
            padding: '4px 10px', background: '#F59E0B20',
            border: '1px solid #F59E0B40', borderRadius: 8,
          }}>
            Click target node — Esc to cancel
          </span>
        )}
      </div>

      <div className="wf-toolbar-view" style={{
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 'auto',
      }}>
        <button
          type="button"
          onClick={execMode === 'hybrid' ? undefined : autoLayout}
          disabled={execMode === 'hybrid'}
          title={execMode === 'hybrid' ? 'Auto Layout is disabled in hybrid mode to preserve manual edges' : 'Auto layout'}
          style={{
            ...SANS, fontSize: 13, fontWeight: 500,
            padding: '6px 4px',
            background: 'none', border: 'none',
            color: 'var(--text-primary)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            opacity: execMode === 'hybrid' ? 0.4 : 1,
            cursor: execMode === 'hybrid' ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="3" width="18" height="6" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <rect x="13" y="13" width="8" height="8" rx="1" />
          </svg>
          Auto layout
        </button>

        <div style={{
          display: 'inline-flex', alignItems: 'center',
          border: '1px solid var(--border)', borderRadius: 999,
          background: 'var(--bg-card)', overflow: 'hidden',
        }}>
          <button
            type="button"
            onClick={zoomOut}
            title="Zoom out (Ctrl+scroll)"
            style={{
              ...SANS, fontSize: 14, lineHeight: 1, padding: '6px 10px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >−</button>
          <button
            type="button"
            onClick={zoomReset}
            title="Reset zoom"
            style={{
              ...SANS, fontSize: 12, fontWeight: 500, minWidth: 44,
              padding: '6px 4px', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-primary)',
              borderLeft: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            title="Zoom in (Ctrl+scroll)"
            style={{
              ...SANS, fontSize: 14, lineHeight: 1, padding: '6px 10px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >+</button>
        </div>
      </div>
    </div>
  </div>
  </>
  )
}
