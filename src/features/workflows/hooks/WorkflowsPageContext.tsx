import { createContext, useContext, type ReactNode } from 'react'
import type { useWorkflowsPage } from './useWorkflowsPage'

export type WorkflowsPageModel = ReturnType<typeof useWorkflowsPage>

const WorkflowsPageContext = createContext<WorkflowsPageModel | null>(null)

export function WorkflowsPageProvider({
  value,
  children,
}: {
  value: WorkflowsPageModel
  children: ReactNode
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
