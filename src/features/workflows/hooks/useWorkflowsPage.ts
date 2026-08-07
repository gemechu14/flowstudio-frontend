import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<WorkflowRecord | null>(null)
  const [wfSearch, setWfSearch] = useState('')
  const [wfModeFilter, setWfModeFilter] = useState<ExecutionMode | ''>('')
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [mobileTab, setMobileTab] = useState<'canvas' | 'run' | 'history'>('canvas')
  const initializedRef = useRef(false)

  // Canvas state
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [execMode, setExecMode] = useState<ExecutionMode>('sequential')
  const [wfName, setWfName] = useState('')
  const [wfDesc, setWfDesc] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const { show: showToast } = useToast()
  const [saving, setSaving] = useState(false)

  // Port-drag state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const hoverCancelRef = useRef<number | null>(null)
  const [portDrag, setPortDrag] = useState<{
    fromNodeId: string; fromSide: string; fromOffset: number; canvasX: number; canvasY: number
  } | null>(null)
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({})

  // Drag state
  const dragging = useRef<{
    nodeId: string; startMX: number; startMY: number
    startNX: number; startNY: number
  } | null>(null)

  // Run state
  const [initialInput, setInitialInput] = useState('')
  const [expandPage, setExpandPage] = useState<{ field: 'wfDesc' | 'initialInput'; label: string } | null>(null)
  const [expandPageValue, setExpandPageValue] = useState('')
  const [loopIterations, setLoopIterations] = useState(3)
  const [enableMemory, setEnableMemory] = useState(false)
  const [convergenceExpr, setConvergenceExpr] = useState('')
  const [running, setRunning] = useState(false)
  const [deleteWfTarget, setDeleteWfTarget] = useState<string | null>(null)
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null)
  const [runError, setRunError] = useState('')

  // History
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<WorkflowRun | null>(null)

  // Canvas zoom
  const [zoom, setZoom] = useState(1)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [editingEdgeLabel, setEditingEdgeLabel] = useState('')
  const ZOOM_MIN = 0.3
  const ZOOM_MAX = 2
  const ZOOM_STEP = 0.1
  const zoomIn  = () => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  const zoomReset = () => setZoom(1)

  // Run panel resize
  const [runPanelH, setRunPanelH] = useState(420)
  const runPanelMinH = 36
  const resizeDragRef = useRef<{ startY: number; startH: number } | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  const { data: workflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: queryKeys.workflows,
    queryFn: () => listWorkflows().catch(() => [] as WorkflowRecord[]),
  })

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents,
    queryFn: () => listAgents().catch(() => [] as AgentRecord[]),
  })

  const selectedId = selected?.workflow_id ?? ''

  const { data: runs = [], isLoading: runsLoading, isFetching: runsFetching } = useQuery({
    queryKey: queryKeys.workflowRuns(selectedId),
    queryFn: () => listRuns(selectedId).catch(() => [] as WorkflowRun[]),
    enabled: !!selectedId,
  })

  const runsBusy = !!selectedId && (runsLoading || (runsFetching && runs.length === 0))

  // Run panel drag-resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeDragRef.current) return
      const dy = resizeDragRef.current.startY - e.clientY
      setRunPanelH(Math.max(runPanelMinH, Math.min(700, resizeDragRef.current.startH + dy)))
    }
    const onUp = () => { resizeDragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const loadWorkflow = (wf: WorkflowRecord) => {
    setSelected(wf)
    setWfName(wf.name)
    setWfDesc(wf.description || '')
    setExecMode(wf.execution_mode || 'sequential')
    setLoopIterations(wf.loop_iterations || 3)
    setEnableMemory(wf.enable_memory || false)
    setConvergenceExpr(wf.convergence_expr || '')
    const { nodes: hydratedNodes, edges: hydratedEdges } = hydrateWorkflowGraph(wf)
    setNodes(hydratedNodes)
    setEdges(hydratedEdges)
    setCurrentRun(null)
    setSelectedHistoryRun(null)
    setInitialInput('')
    setRunError('')
  }

  // Select first workflow once data is ready
  useEffect(() => {
    if (initializedRef.current || workflowsLoading) return
    initializedRef.current = true
    if (workflows.length > 0) loadWorkflow(workflows[0])
  }, [workflowsLoading, workflows])

  // ── canvas mouse events ──────────────────────────────────────────────────
  // Listeners are attached to window during drag so fast mouse movement
  // outside the canvas div doesn't lose mouseup and corrupt drag state.

  const startDrag = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const node = nodes.find(n => n.node_id === nodeId)
    if (!node) return
    dragging.current = {
      nodeId,
      startMX: e.clientX, startMY: e.clientY,
      startNX: node.position_x, startNY: node.position_y,
    }

    const onMove = (ev: MouseEvent) => {
      const d = dragging.current
      if (!d) return
      const dx = ev.clientX - d.startMX
      const dy = ev.clientY - d.startMY
      const newX = Math.max(0, d.startNX + dx)
      const newY = Math.max(0, d.startNY + dy)
      const targetId = d.nodeId
      setNodes(prev =>
        prev.map(n =>
          n.node_id === targetId
            ? { ...n, position_x: newX, position_y: newY }
            : n
        )
      )
    }
    const onUp = () => {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [nodes])

  // ── add / delete nodes ───────────────────────────────────────────────────

  const addNode = (type: string = 'agent') => {
    const col = nodes.length % 4
    const row = Math.floor(nodes.length / 4)
    const newNode: WorkflowNode = {
      node_id: newId('nd'),
      node_type: type as any,
      label: type === 'orchestrator' ? 'Coordinator'
      : type === 'subworkflow' ? 'Sub-workflow'
      : type === 'collaborative_node' ? 'Collab Loop'
      : 'Agent Node',
      agent_id: null,
      position_x: 40 + col * 240,
      position_y: 40 + row * 140,
      config: {},
    }
    setNodes(prev => [...prev, newNode])
  }

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.node_id !== nodeId))
    setEdges(prev => prev.filter(e => e.from_node_id !== nodeId && e.to_node_id !== nodeId))
    if (connectingFrom === nodeId) setConnectingFrom(null)
  }

  const updateNodeField = (nodeId: string, agent_id: string, label: string, type: string) => {
    setNodes(prev => prev.map(n =>
      n.node_id === nodeId ? { ...n, agent_id: agent_id || null, label, node_type: type as any } : n
    ))
  }

  const updateNodeConfig = (nodeId: string, config: Record<string, unknown>) => {
    setNodes(prev => prev.map(n =>
      n.node_id === nodeId ? { ...n, config } : n
    ))
  }

  // ── connect ──────────────────────────────────────────────────────────────


  const completeConnect = (toNodeId: string) => {
    if (!connectingFrom || connectingFrom === toNodeId) {
      setConnectingFrom(null); return
    }
    const alreadyExists = edges.some(
      e => e.from_node_id === connectingFrom && e.to_node_id === toNodeId
    )
    if (!alreadyExists) {
      setEdges(prev => [...prev, {
        edge_id: newId('e'),
        from_node_id: connectingFrom,
        to_node_id: toNodeId,
        label: '', condition_expr: '',
      }])
    }
    setConnectingFrom(null)
  }

  // ── port-handle drag ─────────────────────────────────────────────────────

  const startPortDrag = (fromNodeId: string, fromSide: string, fromOffset: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const canvasX = (e.clientX - rect.left) / zoom
    const canvasY = (e.clientY - rect.top) / zoom
    setPortDrag({ fromNodeId, fromSide, fromOffset, canvasX, canvasY })

    const onMove = (ev: MouseEvent) => {
      const r = canvasRef.current?.getBoundingClientRect()
      if (!r) return
      setPortDrag(prev => prev ? {
        ...prev,
        canvasX: (ev.clientX - r.left) / zoom,
        canvasY: (ev.clientY - r.top) / zoom,
      } : null)
    }

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const r = canvasRef.current?.getBoundingClientRect()
      if (!r) { setPortDrag(null); return }
      const cx = (ev.clientX - r.left) / zoom
      const cy = (ev.clientY - r.top) / zoom
      // Find target node under cursor (use actual height, not hardcoded 500)
      const target = nodes.find(n => {
        const h = nodeHeights[n.node_id] || NODE_H
        return cx >= n.position_x - 16 && cx <= n.position_x + NODE_W + 16 &&
               cy >= n.position_y - 16 && cy <= n.position_y + h + 16 &&
               n.node_id !== fromNodeId
      })
      if (target) {
        // Snap to the nearest displayed port dot — use the same portOffsets() the dots
        // are rendered with so every visible dot is a valid snap target.
        const th = nodeHeights[target.node_id] || NODE_H
        const hOffs = portOffsets(NODE_W)
        const vOffs = portOffsets(th)
        let bestDist = Infinity, toSide = 'left', toOffset = 0.5;
        (['top', 'bottom', 'left', 'right'] as const).forEach(side => {
          const offs = (side === 'left' || side === 'right') ? vOffs : hOffs
          offs.forEach(off => {
            const p = getPortPos(target, side, off, nodeHeights)
            const d = Math.hypot(cx - p.x, cy - p.y)
            if (d < bestDist) { bestDist = d; toSide = side; toOffset = off }
          })
        })
        const already = edges.some(
          ed => ed.from_node_id === fromNodeId && ed.to_node_id === target.node_id &&
                ed.from_side === fromSide && ed.from_offset === fromOffset
        )
        if (!already) {
          setEdges(prev => [...prev, {
            edge_id: newId('e'),
            from_node_id: fromNodeId,
            to_node_id: target.node_id,
            label: '', condition_expr: '',
            from_side: fromSide, from_offset: fromOffset,
            to_side: toSide, to_offset: toOffset,
          }])
        }
      }
      setPortDrag(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // While dragging: show dots on all nodes (so user can see drop targets).
  // While hovering: show dots only on hovered node.
  const showPortsFor: string | 'all' | null = portDrag ? 'all' : hoveredNodeId

  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.edge_id !== edgeId))
  }

  // ── auto-layout ──────────────────────────────────────────────────────────

  const autoLayout = () => {
    const layout = computeAutoLayout(execMode, nodes, nodeHeights)
    setNodes(layout.nodes)
    setEdges(layout.edges)
  }

  // ── save ─────────────────────────────────────────────────────────────────

  const saveWorkflow = async () => {
    setSaving(true)
    try {
      const body = {
        name: wfName || 'Untitled Workflow',
        description: wfDesc,
        execution_mode: execMode,
        nodes, edges, steps: [],
        enable_memory: enableMemory,
        convergence_expr: convergenceExpr,
        ...(execMode === 'collaborative' ? { loop_iterations: loopIterations } : {}),
      }
      let wf: WorkflowRecord
      if (selected) {
        wf = await updateWorkflow(selected.workflow_id, body)
      } else {
        wf = await createWorkflow(body)
      }
      setSelected(wf)
      queryClient.setQueryData<WorkflowRecord[]>(queryKeys.workflows, (prev = []) => {
        const idx = prev.findIndex(w => w.workflow_id === wf.workflow_id)
        return idx >= 0 ? prev.map((w, i) => i === idx ? wf : w) : [wf, ...prev]
      })
      invalidateDashboardStats()
      showToast('success', 'Workflow saved successfully')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const openMobileDetail = (tab: 'canvas' | 'run' | 'history' = 'canvas') => {
    setMobileTab(tab)
    setMobileShowDetail(true)
  }

  const selectHistoryRun = (r: WorkflowRun) => {
    setSelectedHistoryRun(r)
    setCurrentRun(null)
    setInitialInput(r.initial_input)
    setRunError('')
    setRunPanelH(420)
    openMobileDetail('run')
  }

  // ── new workflow ──────────────────────────────────────────────────────────

  const newWorkflow = () => {
    setSelected(null)
    setWfName('New Workflow')
    setWfDesc('')
    setExecMode('sequential')
    setLoopIterations(3)
    setEnableMemory(false)
    setConvergenceExpr('')
    setNodes([])
    setEdges([])
    setCurrentRun(null)
    openMobileDetail('canvas')
  }

  // ── delete workflow ───────────────────────────────────────────────────────

  const doDeleteWorkflow = (wfId: string) => setDeleteWfTarget(wfId)

  const confirmDeleteWorkflow = async () => {
    if (!deleteWfTarget) return
    const wfId = deleteWfTarget
    setDeleteWfTarget(null)
    try {
      await deleteWorkflow(wfId)
    } catch (e: unknown) {
      setRunError(e instanceof Error ? e.message : 'Failed to delete workflow')
      return
    }
    const remaining = workflows.filter(w => w.workflow_id !== wfId)
    queryClient.setQueryData<WorkflowRecord[]>(queryKeys.workflows, remaining)
    invalidateDashboardStats()
    if (selected?.workflow_id === wfId) {
      if (remaining.length > 0) {
        loadWorkflow(remaining[0])
        openMobileDetail('canvas')
      } else {
        newWorkflow()
        setMobileShowDetail(false)
      }
    }
  }

  // ── run ───────────────────────────────────────────────────────────────────

  const pollRunRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pollRun = useCallback((workflowId: string, run: WorkflowRun) => {
    pollRunRef.current = setTimeout(async () => {
      try {
        const updated = await getRun(workflowId, run.run_id)
        setCurrentRun(updated)
        queryClient.setQueryData<WorkflowRun[]>(queryKeys.workflowRuns(workflowId), (prev = []) =>
          prev.map(r => r.run_id === updated.run_id ? updated : r)
        )
        if (updated.status === 'running' || updated.status === 'awaiting_checkpoint') {
          if (updated.status === 'running') setRunning(true)
          else setRunning(false)  // allow user to interact with HITL panel
          pollRun(workflowId, updated)
        } else {
          setRunning(false)
          queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns(workflowId) })
          invalidateDashboardStats()
        }
      } catch {
        setRunning(false)
      }
    }, 2000)
  }, [queryClient])

  const doRun = async () => {
    if (!selected) { setRunError('Save the workflow first.'); return }
    if (pollRunRef.current) clearTimeout(pollRunRef.current)
    setRunning(true); setRunError(''); setCurrentRun(null); setSelectedHistoryRun(null)
    setMobileTab('run')
    try {
      const run = await runWorkflow(selected.workflow_id, initialInput, '')
      setCurrentRun(run)
      queryClient.setQueryData<WorkflowRun[]>(queryKeys.workflowRuns(selected.workflow_id), (prev = []) =>
        [run, ...prev]
      )
      invalidateDashboardStats()
      // Server returns immediately (202); start polling for completion
      pollRun(selected.workflow_id, run)
    } catch (e: any) {
      setRunError(e.message || String(e))
      setRunning(false)
    }
  }

  // ── fired events — derived from completed node results during a run ────────
  // A node's emits_event is considered fired once that node is completed.
  const firedEvents = useMemo(
    () => computeFiredEvents(currentRun || selectedHistoryRun, execMode, nodes),
    [currentRun, selectedHistoryRun, execMode, nodes],
  )

  const edgePaths = computeEdgePaths(nodes, edges, nodeHeights)
  const { canvasW, canvasH } = computeCanvasSize(nodes, edgePaths, nodeHeights)
  const nodeResultMap = buildNodeResultMap(currentRun || selectedHistoryRun)
  const allModes = ALL_MODES
  const modeIcons = MODE_ICONS

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
