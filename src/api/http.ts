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

// 分页信封：后端所有列表接口统一返回 { list, total, page, page_size }。
interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

// 后端列表接口是分页的，单次只返回一页。循环把每一页都取完再返回，
// 避免数据超过一页(pageSize 条)时被截断。
export async function requestAllPages<T>(path: string, pageSize = 100): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?'
    const data = await request<PageResult<T>>(`${path}${separator}page=${page}&page_size=${pageSize}`)
    all.push(...data.list)
    // 取满 total、或本页不足一页(说明已到最后一页)即结束，保证循环一定终止。
    if (all.length >= data.total || data.list.length < pageSize) return all
  }
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
