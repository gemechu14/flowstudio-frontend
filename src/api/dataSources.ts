import { apiFetch, getToken, BASE_URL } from './client'

const BASE = BASE_URL

export type SourceType = 'document' | 'database' | 'website'

export interface DataSourceRecord {
  source_id: string
  name: string
  description: string
  source_type: SourceType
  connection_url: string
  allowed_tables: string[]
  row_filters: Record<string, string>
  column_redactions: Record<string, string[]>
  seed_url: string
  crawl_schedule: string
  created_at: string
  updated_at: string
}

export interface CreateDataSourcePayload {
  name: string
  description?: string
  source_type: SourceType
  connection_url?: string
  allowed_tables?: string[]
  seed_url?: string
  crawl_schedule?: string
}

export interface FileInfo {
  filename: string
  chunk_count: number
}

export async function listDataSources(): Promise<DataSourceRecord[]> {
  const data = await apiFetch<{ data_sources: DataSourceRecord[] }>('/data-sources')
  return data.data_sources
}

export async function createDataSource(payload: CreateDataSourcePayload): Promise<DataSourceRecord> {
  return apiFetch('/data-sources', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteDataSource(sourceId: string): Promise<void> {
  return apiFetch(`/data-sources/${sourceId}`, { method: 'DELETE' })
}

export async function testConnection(sourceId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/data-sources/${sourceId}/test`, { method: 'POST' })
}

export async function getSchema(sourceId: string): Promise<{ schema: string }> {
  return apiFetch(`/data-sources/${sourceId}/schema`)
}

export async function uploadDocument(
  sourceId: string,
  file: File,
): Promise<{ filename: string; chunks_added: number }> {
  const form = new FormData()
  form.append('file', file)
  // Build auth headers manually — fetch with FormData must not set Content-Type (browser sets boundary)
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const activeTenant = localStorage.getItem('active_tenant')
  if (activeTenant) {
    try { headers['x-active-tenant'] = JSON.parse(activeTenant).tenant_id } catch {}
  }
  const res = await fetch(`${BASE}/data-sources/${sourceId}/upload`, {
    method: 'POST', body: form, headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

export async function listFiles(sourceId: string): Promise<FileInfo[]> {
  const data = await apiFetch<{ files: FileInfo[] }>(`/data-sources/${sourceId}/files`)
  return data.files
}

export async function deleteFile(sourceId: string, filename: string): Promise<void> {
  return apiFetch(`/data-sources/${sourceId}/files?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
}

export async function crawlWebsite(sourceId: string): Promise<{ pages_crawled: number; chunks_added: number }> {
  return apiFetch(`/data-sources/${sourceId}/crawl`, { method: 'POST' })
}
