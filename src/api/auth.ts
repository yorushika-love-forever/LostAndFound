/**
 * 认证（账号）相关接口：登录、注册、读取/修改个人资料、修改密码、注销账号。
 *
 * 使用方：LoginView（登录/注册）、个人中心页（资料、改密、注销）、stores/auth.ts（登录后保存状态）。
 * 依赖：./http 的 request() 与 mapUser()；后端路由统一挂在 /auth 前缀下（除登录/注册外都需带 token）。
 * 对外导出：login、register、getCurrentUser、updateProfile、updatePassword、deactivateAccount。
 */
import { mapUser, request, type BackendUser } from './http'
import type { User } from '@/types'

// 登录接口返回体：token 是 snake_case 的 access_token，用户对象为后端结构。
interface AuthResult {
  access_token: string
  user: BackendUser
}

// /auth/profile 返回体：除用户外可能附带该用户的帖子列表（posts.ts 的 getMyItems 会用到）。
interface ProfileResult {
  user: BackendUser
  posts?: unknown[]
}

/**
 * 登录：POST /api/v1/auth/login
 *
 * @param username 学号（即登录名）
 * @param password 密码
 * @returns { user, accessToken }；accessToken 由 stores/auth 写入 localStorage 的 'campus-token'
 * @throws 学号/密码为空时本地直接抛错；接口失败时抛 Error(后端 msg)
 */
export async function login(username: string, password: string): Promise<{ user: User; accessToken: string }> {
  // 前端先做非空校验，避免明知无效还发一次网络请求。
  if (!username.trim() || !password) throw new Error('请输入学号和密码')
  const data = await request<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password }),
  })
  // 注意字段名转换：后端是 access_token（snake_case），前端统一用 accessToken（camelCase）。
  return { user: mapUser(data.user), accessToken: data.access_token }
}

/**
 * 注册：POST /api/v1/auth/register
 *
 * @param username 学号
 * @param name 姓名
 * @param password 密码
 * @returns 注册成功后的 User
 * @throws 接口失败时抛 Error(后端 msg)
 */
export async function register(username: string, name: string, password: string): Promise<User> {
  const data = await request<BackendUser>('/auth/register', {
    method: 'POST',
    // role 固定为 'student'：这是学生端，注册出来的一律是学生角色，管理员由后台创建。
    body: JSON.stringify({ username: username.trim(), name: name.trim(), password, role: 'student' }),
  })
  return mapUser(data)
}

/**
 * 读取当前登录用户资料：GET /api/v1/auth/profile
 *
 * @returns 当前用户 User
 * @throws 未登录/token 失效时抛错（401 会由 http.ts 触发登出）
 */
export async function getCurrentUser(): Promise<User> {
  const data = await request<ProfileResult>('/auth/profile')
  return mapUser(data.user)
}

/**
 * 修改个人资料：PATCH /api/v1/auth/profile
 *
 * @param input 只提交要改的字段（name / username 均可选，用 PATCH 做局部更新）
 * @returns 更新后的 User
 * @throws 接口失败时抛 Error(后端 msg)
 */
export async function updateProfile(input: { name?: string; username?: string }): Promise<User> {
  const data = await request<ProfileResult>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return mapUser(data.user)
}

/**
 * 修改密码：PATCH /api/v1/auth/password
 *
 * @param input 前端用 camelCase 传参，函数内转成后端的 snake_case 字段。
 * @throws 旧密码错误等业务失败时抛 Error(后端 msg)
 */
export async function updatePassword(input: { oldPassword: string; newPassword: string; confirmPassword: string }): Promise<void> {
  await request('/auth/password', {
    method: 'PATCH',
    // 手动做 camelCase → snake_case 映射：后端只认 old_password/new_password/confirm_password。
    body: JSON.stringify({ old_password: input.oldPassword, new_password: input.newPassword, confirm_password: input.confirmPassword }),
  })
}

/**
 * 注销（停用）账号：DELETE /api/v1/auth/account
 *
 * @throws 接口失败时抛 Error(后端 msg)；成功后需由调用方自行清理本地登录态。
 */
export async function deactivateAccount(): Promise<void> {
  await request('/auth/account', { method: 'DELETE' })
}
