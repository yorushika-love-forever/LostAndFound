import { mapUser, request, type BackendUser } from './http'
import type { User } from '@/types'

interface AuthResult {
  access_token: string
  user: BackendUser
}

interface ProfileResult {
  user: BackendUser
  posts?: unknown[]
}

export async function login(username: string, password: string): Promise<{ user: User; accessToken: string }> {
  if (!username.trim() || !password) throw new Error('请输入学号和密码')
  const data = await request<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password }),
  })
  return { user: mapUser(data.user), accessToken: data.access_token }
}

export async function register(username: string, name: string, password: string): Promise<User> {
  const data = await request<BackendUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), name: name.trim(), password, role: 'student' }),
  })
  return mapUser(data)
}

export async function getCurrentUser(): Promise<User> {
  const data = await request<ProfileResult>('/auth/profile')
  return mapUser(data.user)
}

export async function updateProfile(input: { name?: string; username?: string }): Promise<User> {
  const data = await request<ProfileResult>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return mapUser(data.user)
}

export async function updatePassword(input: { oldPassword: string; newPassword: string; confirmPassword: string }): Promise<void> {
  await request('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ old_password: input.oldPassword, new_password: input.newPassword, confirm_password: input.confirmPassword }),
  })
}

export async function deactivateAccount(): Promise<void> {
  await request('/auth/account', { method: 'DELETE' })
}
