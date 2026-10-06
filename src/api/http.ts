import type { User } from '@/types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export interface Envelope<T> {
  code: number
  msg: string
  data: T
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('campus-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value))
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  let envelope: Envelope<T>
  try {
    envelope = await response.json() as Envelope<T>
  } catch {
    throw new Error(`服务器响应异常（${response.status}）`)
  }

  if (response.status === 401) {
    localStorage.removeItem('campus-token')
    localStorage.removeItem('campus-user')
    window.dispatchEvent(new Event('auth-expired'))
  }
  if (!response.ok || envelope.code !== 0) {
    throw new Error(envelope.msg || `请求失败（${response.status}）`)
  }
  return envelope.data
}

export interface BackendUser {
  id: number | string
  username: string
  name: string
  role: User['role']
}

export function mapUser(user: BackendUser): User {
  return {
    id: Number(user.id),
    name: user.name,
    studentNo: user.username,
    role: user.role,
  }
}
