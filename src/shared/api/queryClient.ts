import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

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

/** Mark dashboard stats stale so the next visit (or active Dashboard) refetches. */
export function invalidateDashboardStats() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats })
}
