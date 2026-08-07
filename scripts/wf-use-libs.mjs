import fs from 'fs'

const pagePath = 'src/features/workflows/pages/WorkflowsPage.tsx'
let s = fs.readFileSync(pagePath, 'utf8')

if (!s.includes("from '../lib/workflowEdges'")) {
  s = s.replace(
    "} from '../lib/workflowsUi'",
    `} from '../lib/workflowsUi'
import { computeEdgePaths, computeCanvasSize, getPortPos, portOffsets, sideTangent, ARROW_REACH, getNodeH } from '../lib/workflowEdges'
import { computeAutoLayout } from '../lib/workflowAutoLayout'
import { hydrateWorkflowGraph } from '../lib/workflowHydrate'
import { computeFiredEvents, buildNodeResultMap, ALL_MODES, MODE_ICONS } from '../lib/workflowRunOverlay'`,
  )
}

// Replace loadWorkflow graph hydration body
s = s.replace(
  /\/\/ DAG nodes take precedence; convert legacy steps otherwise\n[\s\S]*?setEdges\(synthEdges\)\n    \}/,
  `const { nodes: hydratedNodes, edges: hydratedEdges } = hydrateWorkflowGraph(wf)
    setNodes(hydratedNodes)
    setEdges(hydratedEdges)`,
)

// Replace autoLayout function body
s = s.replace(
  /const autoLayout = \(\) => \{[\s\S]*?^\s{2}\}/m,
  `const autoLayout = () => {
    const layout = computeAutoLayout(execMode, nodes, nodeHeights)
    setNodes(layout.nodes)
    setEdges(layout.edges)
  }`,
)

// Replace firedEvents useMemo
s = s.replace(
  /const firedEvents = useMemo<Set<string>>\(\(\) => \{[\s\S]*?\}, \[currentRun, selectedHistoryRun, execMode, nodes\]\)/,
  `const firedEvents = useMemo(
    () => computeFiredEvents(currentRun || selectedHistoryRun, execMode, nodes),
    [currentRun, selectedHistoryRun, execMode, nodes],
  )`,
)

// Replace edge geometry + canvas size + nodeResultMap + modes block
s = s.replace(
  /\/\/ ── edge SVG paths ─+[\s\S]*?const modeIcons: Record<ExecutionMode, string> = \{[\s\S]*?\n  \}/,
  `const edgePaths = computeEdgePaths(nodes, edges, nodeHeights)
  const { canvasW, canvasH } = computeCanvasSize(nodes, edgePaths, nodeHeights)
  const nodeResultMap = buildNodeResultMap(currentRun || selectedHistoryRun)
  const allModes = ALL_MODES
  const modeIcons = MODE_ICONS`,
)

fs.writeFileSync(pagePath, s)
console.log('page updated, lines:', s.split(/\n/).length)
