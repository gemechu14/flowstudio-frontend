/// <reference types="vite/client" />

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail))
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, (body as { detail?: unknown }).detail ?? body)
  }
  return res.json() as Promise<T>
}
