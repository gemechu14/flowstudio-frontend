const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...((opts.headers as Record<string, string>) ?? {}) },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function listDataSources(): Promise<DataSourceRecord[]> {
  const data = await req<{ data_sources: DataSourceRecord[] }>('/data-sources')
  return data.data_sources
}

export async function createDataSource(payload: CreateDataSourcePayload): Promise<DataSourceRecord> {
  return req('/data-sources', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteDataSource(sourceId: string): Promise<void> {
  return req(`/data-sources/${sourceId}`, { method: 'DELETE' })
}

export async function testConnection(sourceId: string): Promise<{ success: boolean; message: string }> {
  return req(`/data-sources/${sourceId}/test`, { method: 'POST' })
}

export async function getSchema(sourceId: string): Promise<{ schema: string }> {
  return req(`/data-sources/${sourceId}/schema`)
}

export async function uploadDocument(
  sourceId: string,
  file: File,
): Promise<{ filename: string; chunks_added: number }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/data-sources/${sourceId}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

export async function listFiles(sourceId: string): Promise<FileInfo[]> {
  const data = await req<{ files: FileInfo[] }>(`/data-sources/${sourceId}/files`)
  return data.files
}

export async function deleteFile(sourceId: string, filename: string): Promise<void> {
  return req(`/data-sources/${sourceId}/files?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
}

export async function crawlWebsite(sourceId: string): Promise<{ pages_crawled: number; chunks_added: number }> {
  return req(`/data-sources/${sourceId}/crawl`, { method: 'POST' })
}
