import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const queryKeys = {
  dashboardStats: ['dashboard-stats'] as const,
  agents: ['agents'] as const,
  workflows: ['workflows'] as const,
  tools: ['tools'] as const,
  communityCatalog: ['community-catalog'] as const,
  communitySubmissions: ['community-submissions'] as const,
  channels: ['channels'] as const,
  dataSources: ['data-sources'] as const,
  mcpServers: ['mcp-servers'] as const,
  apiKeys: ['api-keys'] as const,
  workflowRuns: (workflowId: string) => ['workflow-runs', workflowId] as const,
}

/** Mark dashboard stats stale so the next visit (or active Dashboard) refetches. */
export function invalidateDashboardStats() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats })
}
