/**
 * Further-split WorkflowsPage into hook + presentational shells.
 * Run from repo root: node scripts/wf-split-page.mjs
 */
import fs from 'fs'
import path from 'path'

const pagePath = 'src/features/workflows/pages/WorkflowsPage.tsx'
const lines = fs.readFileSync(pagePath, 'utf8').split(/\r?\n/)
const slice = (a, b) => lines.slice(a - 1, b).join('\n') // inclusive end

const comps = 'src/features/workflows/components'
const hooks = 'src/features/workflows/hooks'
fs.mkdirSync(comps, { recursive: true })
fs.mkdirSync(hooks, { recursive: true })

// ── ExpandTextModal ──────────────────────────────────────────────────────────
fs.writeFileSync(path.join(comps, 'ExpandTextModal.tsx'), `import { MONO } from '../lib/workflowsUi'

export function ExpandTextModal({
  label,
  value,
  rows,
  placeholder,
  onChange,
  onCancel,
  onApply,
}: {
  label: string
  value: string
  rows: number
  placeholder: string
  onChange: (v: string) => void
  onCancel: () => void
  onApply: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12, padding: 24,
          width: 640, maxWidth: '92vw',
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </span>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >×</button>
        </div>
        <textarea
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 13, lineHeight: 1.6,
            padding: '10px 14px',
            background: 'var(--bg-page)', color: 'var(--text-body)',
            border: '1px solid var(--blue-border)',
            borderRadius: 7, resize: 'vertical',
            fontFamily: 'var(--font-sans)',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ ...MONO, fontSize: 11, padding: '7px 18px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)' }}
          >Cancel</button>
          <button
            onClick={onApply}
            style={{ ...MONO, fontSize: 11, padding: '7px 18px', background: 'var(--accent)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--btn-upload-text)', fontWeight: 700 }}
          >Apply</button>
        </div>
      </div>
    </div>
  )
}
`)

// Helper: dump a JSX body as a component with `props` bag to avoid huge rewrite risk.
// We keep closures working by accepting a typed props object matching what the page passes.

// ── Move logic into useWorkflowsPage ─────────────────────────────────────────
// Lines 25-488 are the function body before return (state + handlers + derived).
// We'll wrap that as a hook returning everything the JSX needs.

const logicBody = slice(26, 488) // inside WorkflowsPage, before return
  .replace(/^  /gm, '') // dedent one level later carefully — keep as-is with 2-space indent for hook body

// Actually keep indentation: hook body should be indented 2 spaces from export function.
// Current slice already has 2-space indent from being inside the page function. Good for hook body.

fs.writeFileSync(path.join(hooks, 'useWorkflowsPage.ts'), `import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../../shared/components/ui/Toast'
import { type AgentRecord, listAgents } from '../../agents/api/agents.api'
import {
  type WorkflowRecord, type WorkflowNode, type WorkflowEdge, type WorkflowRun,
  type ExecutionMode,
  listWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, runWorkflow, listRuns, getRun,
} from '../api/workflows.api'
import { invalidateDashboardStats } from '../../../shared/api/queryClient'
import { queryKeys } from '../../../shared/api/queryKeys'
import {
  NODE_W, NODE_H, newId,
} from '../lib/workflowsUi'
import { computeEdgePaths, computeCanvasSize, getPortPos, portOffsets, sideTangent } from '../lib/workflowEdges'
import { computeAutoLayout } from '../lib/workflowAutoLayout'
import { hydrateWorkflowGraph } from '../lib/workflowHydrate'
import { computeFiredEvents, buildNodeResultMap, ALL_MODES, MODE_ICONS } from '../lib/workflowRunOverlay'

export function useWorkflowsPage() {
${slice(26, 488)}

  const nodeMap = Object.fromEntries(nodes.map(n => [n.node_id, n]))

  return {
    // selection / list
    selected, setSelected, wfSearch, setWfSearch, wfModeFilter, setWfModeFilter,
    mobileShowDetail, setMobileShowDetail, mobileTab, setMobileTab,
    workflows, workflowsLoading, agents, runs, runsBusy, loading: workflowsLoading,
    // document
    nodes, setNodes, edges, setEdges, execMode, setExecMode,
    wfName, setWfName, wfDesc, setWfDesc,
    selectedNodeId, setSelectedNodeId, connectingFrom, setConnectingFrom,
    saving, showToast,
    // canvas interaction
    hoveredNodeId, setHoveredNodeId, hoverCancelRef, portDrag, setPortDrag,
    nodeHeights, setNodeHeights, dragging, canvasRef,
    zoom, setZoom, zoomIn, zoomOut, zoomReset, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
    editingEdgeId, setEditingEdgeId, editingEdgeLabel, setEditingEdgeLabel,
    showPortsFor,
    // run
    initialInput, setInitialInput, expandPage, setExpandPage, expandPageValue, setExpandPageValue,
    loopIterations, setLoopIterations, enableMemory, setEnableMemory, convergenceExpr, setConvergenceExpr,
    running, deleteWfTarget, setDeleteWfTarget, currentRun, setCurrentRun, runError, setRunError,
    selectedHistoryRun, setSelectedHistoryRun,
    runPanelH, setRunPanelH, runPanelMinH, resizeDragRef,
    // derived
    firedEvents, edgePaths, canvasW, canvasH, nodeResultMap, allModes, modeIcons, nodeMap,
    // handlers
    loadWorkflow, startDrag, addNode, deleteNode, updateNodeField, updateNodeConfig,
    completeConnect, startPortDrag, deleteEdge, autoLayout,
    saveWorkflow, openMobileDetail, selectHistoryRun, newWorkflow,
    doDeleteWorkflow, confirmDeleteWorkflow, doRun, pollRun,
    getPortPos, portOffsets, sideTangent,
  }
}
`)

console.log('Wrote useWorkflowsPage.ts')

// Verify which symbols exist in logic — scan for missing handler names
const logic = slice(26, 488)
const needed = [
  'updateNodeField', 'updateNodeConfig', 'completeConnect', 'startPortDrag',
  'pollRun', 'doRun', 'loading',
]
for (const n of needed) {
  console.log(n, logic.includes(n) ? 'ok' : 'MISSING')
}

console.log('Total page lines still', lines.length)
console.log('Next: write presentational components + thin page (manual step in same script if markers found)')
