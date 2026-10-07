/**
 * API 基础模块：所有网络请求的公共底座。
 *
 * 职责：封装原生 fetch、自动注入鉴权头、解包后端统一响应信封 { code, msg, data }、
 * 统一错误处理，并提供分页列表的「自动翻页」工具与用户对象映射。
 * 依赖：Vite 环境变量 VITE_API_BASE_URL；本文件不 import 任何页面，
 * 只被 auth/posts/comments/conversations/appeals/geo 等 api 模块复用。
 * 对外导出：request()、requestAllPages()、mapUser() 及 Envelope/BackendUser 类型。
 */
import type { User } from '@/types'

// API_BASE 必须是「相对路径」（默认 /api/v1，可由 VITE_API_BASE_URL 覆盖）：
// 生产环境用 Caddy 把前端静态资源与 /api 反向代理到同一域名，浏览器同源访问即可，
// 若写成绝对 URL 反而会跨域、并绕过同源代理。末尾 replace 去掉多余的 '/'，防止拼出 '//posts'。
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

// 后端统一响应信封：code !== 0 表示业务失败，真正数据在 data 中。
export interface Envelope<T> {
  code: number
  msg: string
  data: T
}

// 从 localStorage 读取登录时保存的 JWT（key 为 'campus-token'），拼成 Authorization 头。
// token 自带 exp，后端会校验有效期；未登录时返回空对象，即不带该请求头。
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('campus-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 发起一次 API 请求并解包响应信封。
 *
 * @param path 相对 API_BASE 的路径，如 '/posts/1'（可含查询串）。
 * @param init 标准 fetch 初始化参数（method/body/headers 等）。
 * @returns 信封中的 data 字段（按类型 T 断言）。
 * @throws 响应非合法 JSON 时抛「服务器响应异常」；HTTP 非 2xx 或信封 code !== 0 时抛 Error(msg)。
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  // 把鉴权头合并进来（后写入，调用方即使误传同名头也会被登录态覆盖）。
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value))
  // 仅当有 body 且不是 FormData 时才补 JSON Content-Type：
  // FormData（上传图片）必须让浏览器自动生成带 boundary 的 multipart 头，手动设置会破坏上传。
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  let envelope: Envelope<T>
  try {
    envelope = await response.json() as Envelope<T>
  } catch {
    // 网关错误页等场景可能返回非 JSON，此处转成可读错误，避免 JSON 解析异常直接冒泡给页面。
    throw new Error(`服务器响应异常（${response.status}）`)
  }

  if (response.status === 401) {
    // 401 表示 token 过期或失效：清掉本地登录态并广播 'auth-expired' 事件，
    // 由 stores/auth.ts 监听后把用户置为 null，触发界面回到未登录状态，避免停留在「假登录」页面。
    localStorage.removeItem('campus-token')
    localStorage.removeItem('campus-user')
    window.dispatchEvent(new Event('auth-expired'))
  }
  // 双重判定：HTTP 状态非 2xx，或信封 code 非 0，都算失败（后端业务错误通常仍返回 200）。
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
/**
 * 逐页拉取分页列表，直到把 total 条数据全部取完为止。
 *
 * @param path 列表接口路径，可已带查询串（如 '/posts?type=lost'）。
 * @param pageSize 每页条数，默认 100。
 * @returns 所有页拼接后的完整数组。
 * @throws 任意一页请求失败时，内部 request() 抛出的 Error 会向上冒泡。
 */
export async function requestAllPages<T>(path: string, pageSize = 100): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; ; page += 1) {
    // 已带查询串的路径要用 '&' 续接，否则用 '?' 起头，
    // 防止拼出 '?type=lost?page=1' 这类非法 URL。
    const separator = path.includes('?') ? '&' : '?'
    const data = await request<PageResult<T>>(`${path}${separator}page=${page}&page_size=${pageSize}`)
    all.push(...data.list)
    // 取满 total、或本页不足一页(说明已到最后一页)即结束，保证循环一定终止。
    // 补充说明这两个终止条件缺一不可：
    // 1) all.length >= total：已取满后端声明的总数，正常结束；
    // 2) data.list.length < pageSize：后端提前返回不足一页（total 可能不准），兜底结束，避免死循环。
    if (all.length >= data.total || data.list.length < pageSize) return all
  }
}

/** 后端返回的用户结构（snake_case，与数据库字段一致）。 */
export interface BackendUser {
  id: number | string
  username: string
  name: string
  role: User['role']
}

/**
 * 把后端用户对象映射为前端 User（snake_case → camelCase）。
 *
 * @param user 后端返回的用户。
 * @returns 前端 User；studentNo 取自后端的 username（本项目登录名即学号）。
 */
export function mapUser(user: BackendUser): User {
  // 后端 id 可能是 number 或 string（大整数经 JSON 变字符串），统一 Number() 归一化。
  return {
    id: Number(user.id),
    name: user.name,
    studentNo: user.username,
    role: user.role,
  }
}
