import { getProfileApi, loginApi } from '@/api/admin'
import type { AdminUser } from '@/admin/types'

const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getAdminUser(): AdminUser | null {
  const text = localStorage.getItem(USER_KEY)
  if (!text) return null

  try {
    return JSON.parse(text) as AdminUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export async function adminLogin(username: string, password: string) {
  const result = await loginApi(username, password)
  const token = result.access_token || result.token

  if (!token) {
    throw new Error('登录成功，但后端没有返回 Token')
  }

  if (result.user.role !== 'postadmin' && result.user.role !== 'mainadmin') {
    throw new Error('当前账号没有管理端权限')
  }

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(result.user))

  return result.user
}

export async function refreshAdminUser() {
  const result = await getProfileApi()
  localStorage.setItem(USER_KEY, JSON.stringify(result.user))
  return result.user
}

export function adminLogout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
