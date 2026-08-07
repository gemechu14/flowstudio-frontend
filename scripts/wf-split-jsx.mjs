/**
 * Split WorkflowsPage JSX into context-consuming section components + thin page.
 */
import fs from 'fs'
import path from 'path'

const pagePath = 'src/features/workflows/pages/WorkflowsPage.tsx'
const lines = fs.readFileSync(pagePath, 'utf8').split(/\r?\n/)
const slice = (a, b) => lines.slice(a - 1, b).join('\n') // inclusive

const comps = 'src/features/workflows/components'
const hooks = 'src/features/workflows/hooks'

// Context
fs.writeFileSync(path.join(hooks, 'WorkflowsPageContext.tsx'), `import { createContext, useContext } from 'react'
import type { useWorkflowsPage } from './useWorkflowsPage'

export type WorkflowsPageModel = ReturnType<typeof useWorkflowsPage>

const WorkflowsPageContext = createContext<WorkflowsPageModel | null>(null)

export function WorkflowsPageProvider({
  value,
  children,
}: {
  value: WorkflowsPageModel
  children: React.ReactNode
}) {
  return (
    <WorkflowsPageContext.Provider value={value}>
      {children}
    </WorkflowsPageContext.Provider>
  )
}

export function useWorkflowsPageModel(): WorkflowsPageModel {
  const ctx = useContext(WorkflowsPageContext)
  if (!ctx) throw new Error('useWorkflowsPageModel must be used within WorkflowsPageProvider')
  return ctx
}
`)

function wrapSection(name, imports, bodyJsx, extraDestructure = '') {
  return `${imports}

import { useWorkflowsPageModel } from '../hooks/WorkflowsPageContext'

export function ${name}() {
  const w = useWorkflowsPageModel()
  const {
${extraDestructure}
  } = w

  return (
${bodyJsx}
  )
}
`
}

// List pane: lines 495-662 (the left panel div)
{
  const body = slice(495, 662)
  // indent: body already has 6 spaces from being nested; reduce by 4 for component return child
  const indented = body.split('\n').map(l => (l.startsWith('      ') ? l.slice(4) : l)).join('\n')
  fs.writeFileSync(path.join(comps, 'WorkflowsListPane.tsx'), `import type { ExecutionMode, WorkflowRecord } from '../api/workflows.api'
import { RunHistoryPanel } from './RunHistoryPanel'
import { WorkflowsListSkeleton } from './WorkflowsSkeleton'
import { SANS, modeShort, relativeTime } from '../lib/workflowsUi'
import { useWorkflowsPageModel } from '../hooks/WorkflowsPageContext'

export function WorkflowsListPane() {
  const {
    wfSearch, setWfSearch, wfModeFilter, setWfModeFilter,
    workflows, loading, selected, loadWorkflow, openMobileDetail, newWorkflow,
    runs, runsBusy, selectHistoryRun, selectedHistoryRun, setSelectedHistoryRun,
  } = useWorkflowsPageModel()

  return (
${indented}
  )
}
`)
}

// Toolbar: 672-987
{
  const body = slice(672, 987)
  const indented = body.split('\n').map(l => (l.startsWith('        ') ? l.slice(6) : l.startsWith('      ') ? l.slice(4) : l)).join('\n')
  fs.writeFileSync(path.join(comps, 'WorkflowToolbar.tsx'), `import type { ExecutionMode } from '../api/workflows.api'
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
${indented}
  )
}
`)
}

// Canvas: 989-1236
{
  const body = slice(989, 1236)
  const indented = body.split('\n').map(l => (l.startsWith('        ') ? l.slice(6) : l.startsWith('      ') ? l.slice(4) : l)).join('\n')
  fs.writeFileSync(path.join(comps, 'WorkflowCanvas.tsx'), `import { CanvasNodeCard } from './CanvasNodeCard'
import { NODE_W, NODE_TYPE_COLORS } from '../lib/workflowsUi'
import { ARROW_REACH, getNodeH, getPortPos, portOffsets, sideTangent } from '../lib/workflowEdges'
import { useWorkflowsPageModel } from '../hooks/WorkflowsPageContext'

export function WorkflowCanvas() {
  const {
    mobileTab, canvasRef, canvasW, canvasH, zoom, setZoom,
    ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
    connectingFrom, setConnectingFrom,
    edgePaths, nodes, agents, selectedNodeId, setSelectedNodeId,
    nodeResultMap, execMode, workflows, selected,
    startDrag, completeConnect, hoverCancelRef, setHoveredNodeId, setNodeHeights,
    updateNodeField, updateNodeConfig, deleteNode,
    currentRun, selectedHistoryRun, firedEvents,
    portDrag, nodeMap, showPortsFor, startPortDrag,
    editingEdgeId, setEditingEdgeId, editingEdgeLabel, setEditingEdgeLabel,
    deleteEdge, setEdges, addNode,
  } = useWorkflowsPageModel()

  return (
${indented}
  )
}
`)
}

// Run panel + mobile history: 1238-1503
{
  const body = slice(1238, 1503)
  const indented = body.split('\n').map(l => (l.startsWith('        ') ? l.slice(6) : l.startsWith('      ') ? l.slice(4) : l)).join('\n')
  fs.writeFileSync(path.join(comps, 'WorkflowRunPanel.tsx'), `import { RunResultPanel } from './RunResultPanel'
import { RunHistoryPanel } from './RunHistoryPanel'
import { MONO, TEAL } from '../lib/workflowsUi'
import { useWorkflowsPageModel } from '../hooks/WorkflowsPageContext'

export function WorkflowRunPanel() {
  const {
    mobileTab, initialInput, setInitialInput, setExpandPageValue, setExpandPage,
    execMode, setExecMode, loopIterations, setLoopIterations,
    convergenceExpr, setConvergenceExpr, enableMemory, setEnableMemory,
    doRun, running, selected, runError, allModes, modeIcons,
    currentRun, selectedHistoryRun, runPanelH, setRunPanelH, runPanelMinH, resizeDragRef,
    setCurrentRun, setSelectedHistoryRun, pollRun,
    runs, runsBusy, selectHistoryRun,
  } = useWorkflowsPageModel()

  return (
    <>
${indented}
    </>
  )
}
`)
}

// Thin page
fs.writeFileSync(pagePath, `import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import { SANS } from '../lib/workflowsUi'
import { useWorkflowsPage } from '../hooks/useWorkflowsPage'
import { WorkflowsPageProvider } from '../hooks/WorkflowsPageContext'
import { WorkflowsListPane } from '../components/WorkflowsListPane'
import { WorkflowToolbar } from '../components/WorkflowToolbar'
import { WorkflowCanvas } from '../components/WorkflowCanvas'
import { WorkflowRunPanel } from '../components/WorkflowRunPanel'
import { ExpandTextModal } from '../components/ExpandTextModal'
import { WorkflowsCanvasSkeleton } from '../components/WorkflowsSkeleton'

export default function WorkflowsPage() {
  const w = useWorkflowsPage()

  return (
    <WorkflowsPageProvider value={w}>
      <div className={\`wf-page\${w.mobileShowDetail ? ' is-detail-open' : ''}\`} style={{ display: 'flex', height: '100%', gap: 0, ...SANS }}>
        <WorkflowsListPane />

        {/* Main area */}
        <div className="wf-detail-pane" style={{ flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
          {w.loading ? (
            <div className="wf-detail-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <WorkflowsCanvasSkeleton />
            </div>
          ) : (
            <div className="wf-detail-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <WorkflowToolbar />
              <WorkflowCanvas />
              <WorkflowRunPanel />
            </div>
          )}
        </div>

        <style>{\`
          @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        \`}</style>

        {w.expandPage && (
          <ExpandTextModal
            label={w.expandPage.label}
            value={w.expandPageValue}
            rows={w.expandPage.field === 'initialInput' ? 12 : 5}
            placeholder={w.expandPage.field === 'initialInput' ? 'Paste your full prompt here…' : 'Workflow description…'}
            onChange={w.setExpandPageValue}
            onCancel={() => w.setExpandPage(null)}
            onApply={() => {
              if (w.expandPage!.field === 'wfDesc') w.setWfDesc(w.expandPageValue)
              else w.setInitialInput(w.expandPageValue)
              w.setExpandPage(null)
            }}
          />
        )}

        {w.deleteWfTarget && (
          <ConfirmModal
            message="Delete this workflow and all its run history? This cannot be undone."
            confirmLabel="Delete Workflow"
            onConfirm={w.confirmDeleteWorkflow}
            onClose={() => w.setDeleteWfTarget(null)}
          />
        )}
      </div>
    </WorkflowsPageProvider>
  )
}
`)

console.log('Page lines:', fs.readFileSync(pagePath, 'utf8').split('\\n').length)
console.log('ListPane lines:', fs.readFileSync(path.join(comps, 'WorkflowsListPane.tsx'), 'utf8').split('\\n').length)
console.log('Toolbar lines:', fs.readFileSync(path.join(comps, 'WorkflowToolbar.tsx'), 'utf8').split('\\n').length)
console.log('Canvas lines:', fs.readFileSync(path.join(comps, 'WorkflowCanvas.tsx'), 'utf8').split('\\n').length)
console.log('RunPanel lines:', fs.readFileSync(path.join(comps, 'WorkflowRunPanel.tsx'), 'utf8').split('\\n').length)
console.log('Hook lines:', fs.readFileSync(path.join(hooks, 'useWorkflowsPage.ts'), 'utf8').split('\\n').length)
