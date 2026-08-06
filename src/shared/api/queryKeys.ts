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
