import { BASE_URL, setToken, clearToken } from '../../../shared/api/client'

export interface AuthUser {
  user_id: string
  tenant_id: string
  role: string
  email: string
  first_name: string
  last_name: string
  org_name: string
  access_token: string
}

export interface UserRecord {
  user_id: string
  tenant_id: string
  email: string
  role: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string
}

export async function register(data: {
  org_name: string
  email: string
  password: string
  first_name: string
  last_name: string
}): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((body as any).detail ?? 'Registration failed')
  }
  const user: AuthUser = await res.json()
  setToken(user.access_token)
  return user
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((body as any).detail ?? 'Login failed')
  }
  const user: AuthUser = await res.json()
  setToken(user.access_token)
  return user
}

export function logout(): void {
  clearToken()
  localStorage.removeItem('cl_user')
  window.location.href = '/login'
}

export async function listUsers(): Promise<UserRecord[]> {
  const token = localStorage.getItem('cl_token')
  const res = await fetch(`${BASE_URL}/users`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function createUser(data: {
  email: string
  password: string
  role: 'org_admin' | 'member'
  first_name: string
  last_name: string
}): Promise<UserRecord> {
  const token = localStorage.getItem('cl_token')
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((body as any).detail ?? 'Failed to create user')
  }
  return res.json()
}

export async function updateUser(user_id: string, data: {
  role?: 'org_admin' | 'member'
  first_name?: string
  last_name?: string
  is_active?: boolean
}): Promise<UserRecord> {
  const token = localStorage.getItem('cl_token')
  const res = await fetch(`${BASE_URL}/users/${user_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update user')
  return res.json()
}

export async function deleteUser(user_id: string): Promise<void> {
  const token = localStorage.getItem('cl_token')
  const res = await fetch(`${BASE_URL}/users/${user_id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Failed to delete user')
}
