/// <reference types="vite/client" />

export const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail))
    this.name = 'ApiError'
  }
}

export function getToken(): string | null {
  return localStorage.getItem('cl_token')
}

export function setToken(token: string): void {
  localStorage.setItem('cl_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('cl_token')
}

export class NetworkError extends Error {
  constructor() {
    super('Unable to reach the server')
    this.name = 'NetworkError'
  }
}

function emitBackendUnreachable() {
  window.dispatchEvent(new CustomEvent('backend:unreachable'))
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const activeTenant = localStorage.getItem('cl_active_tenant')
  if (activeTenant) {
    try { headers['x-active-tenant'] = JSON.parse(activeTenant).tenant_id } catch {}
  }
  if (options?.body && !(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal })
  } catch {
    emitBackendUnreachable()
    throw new NetworkError()
  } finally {
    clearTimeout(timeout)
  }

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new ApiError(401, 'Session expired')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, (body as { detail?: unknown }).detail ?? body)
  }
  return res.json() as Promise<T>
}
