import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
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
      <div className={`wf-page${w.mobileShowDetail ? ' is-detail-open' : ''}`} style={{ display: 'flex', height: '100%', gap: 0, ...SANS }}>
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

        <style>{`
          @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        `}</style>

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
