/**
 * 失物/招领帖子（post）相关接口：列表、详情、发布、我的帖子、删除、找回（恢复）。
 *
 * 使用方：HomeView（列表与筛选）、ItemDetailView（详情/发布）、个人中心（我的帖子）等。
 * 依赖：./http 的 request()/requestAllPages()；后端路由挂在 /posts 下。
 * 本文件是「后端 snake_case ↔ 前端 camelCase」转换约定的核心示例（见 BackendPost / mapPost）。
 * 对外导出：BackendPost、mapPost、getItems、getItem、createItem、getMyItems、deletePost、recoverPost、
 *          addFavorite、removeFavorite、getFavoriteItems。
 */
import { request, requestAllPages } from './http'
import type { ItemForm, ItemQuery, LostItem } from '@/types'

// 帖子无配图时的兜底占位图（用站点已存在的 favicon，避免额外请求 404）。
const fallbackImage = '/favicon.ico'

/** 后端帖子结构（snake_case，与数据库字段一致）。 */
export interface BackendPost {
  id: number | string
  user_id: number | string
  author_name?: string
  type: LostItem['type']
  title: string
  content: string
  image_url?: string | null
  location_id?: string
  location_name?: string
  supplement?: string
  status: LostItem['status']
  is_finished: boolean
  created_at: string
  updated_at: string
}

/**
 * 把后端帖子映射为前端 LostItem（snake_case → camelCase）。
 *
 * @param post 后端返回的帖子
 * @returns 前端 LostItem；注意字段并非一一同名：
 *   content→description、location_name→location、image_url→imageUrl、
 *   is_finished→isFinished、user_id→publisherId、author_name→publisherName。
 */
export function mapPost(post: BackendPost): LostItem {
  return {
    id: Number(post.id),
    title: post.title,
    type: post.type,
    // 后端叫 content（正文），前端语义化命名为 description（描述）。
    description: post.content,
    // 三个可选字段统一兜底成非空默认值，页面据此渲染就不会出现 undefined/空串。
    locationId: post.location_id || '',
    location: post.location_name || '未填写地点',
    supplement: post.supplement || '',
    // image_url 是相对路径（由后端/Caddy 同源提供），无图时退回顾占位图。
    imageUrl: post.image_url || fallbackImage,
    status: post.status,
    // 后端是 0/1 的布尔字段名想表达 true/false，用 Boolean() 明确转成布尔值。
    isFinished: Boolean(post.is_finished),
    publisherId: Number(post.user_id),
    // author_name 由后端按 user_id 关联用户表回填（见后端 repository/authorname.go），
    // 缺失时才退回到显示用户 ID，避免像以前那样永远只显示“用户 1”。
    publisherName: post.author_name || `用户 ${post.user_id}`,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  }
}

/**
 * 获取帖子列表（按条件筛选）：GET /api/v1/posts?type=&finished=&keyword=&page=&page_size=
 *
 * @param query 筛选条件：type（lost/found）、finished（是否已完成）、keyword（标题关键词）、location（地点）
 * @returns 映射后的 LostItem 数组（已把后端所有分页取全）
 * @throws 任一页请求失败时抛 Error
 */
export async function getItems(query: ItemQuery = {}): Promise<LostItem[]> {
  const params = new URLSearchParams()
  if (query.type) params.append('type', query.type)
  // finished 是布尔值，而查询串只能放字符串，显式 String() 转成 'true'/'false'；仅当明确传入时才带。
  if (query.finished !== undefined) params.set('finished', String(query.finished))
  // 关键词交给后端按标题模糊搜索（后端 GET /posts 的 keyword 参数，SQL 为 title LIKE）。
  const keyword = query.keyword?.trim()
  if (keyword) params.set('keyword', keyword)
  const list = await requestAllPages<BackendPost>(`/posts?${params.toString()}`)
  // 地点筛选只匹配地点字段本身。
  // 原来是把"标题+描述+地点+补充说明"拼成一串再 includes，导致按地点筛选会意外命中标题和描述。
  // 关键词之所以交给后端：requestAllPages 只保证取全分页，但前端本地过滤需先有全量数据；
  // 后端搜索能利用 SQL 索引，且避免「先分页截断再本地筛」导致结果变少。
  const location = query.location?.trim().toLowerCase() || ''
  return list
    .map(mapPost)
    .filter((item) => !location || item.location.toLowerCase().includes(location))
}

/**
 * 获取帖子详情：GET /api/v1/posts/:id
 *
 * @param id 帖子 ID
 * @returns 单个 LostItem
 * @throws 帖子不存在或接口失败时抛 Error
 */
export async function getItem(id: number): Promise<LostItem> {
  return mapPost(await request<BackendPost>(`/posts/${id}`))
}

/**
 * 发布帖子：POST /api/v1/posts（multipart/form-data）
 *
 * @param form 帖子表单；含可选图片 File
 * @returns 新建的 LostItem
 * @throws 校验失败或接口失败时抛 Error(后端 msg)
 */
export async function createItem(form: ItemForm): Promise<LostItem> {
  // 因为要上传图片文件，必须用 FormData（multipart），不能走 JSON；
  // http.ts 识别到 FormData 会跳过 Content-Type，交给浏览器自动生成边界。
  const body = new FormData()
  body.append('type', form.type)
  body.append('title', form.title.trim())
  // 前端字段叫 description，提交给后端时用后端的字段名 content（snake_case/后端命名约定）。
  body.append('content', form.description.trim())
  // 可选字段只在有值时才 append：空值/空文件不提交，避免后端收到空串或无效文件。
  if (form.image) body.append('image', form.image)
  if (form.locationId) body.append('location_id', form.locationId)
  if (form.supplement.trim()) body.append('supplement', form.supplement.trim())
  return mapPost(await request<BackendPost>('/posts', { method: 'POST', body }))
}

/**
 * 获取当前用户的帖子列表：GET /api/v1/auth/profile
 *
 * 复用「我的资料」接口返回体里的 posts 字段，无需单独的接口。
 * @returns 当前用户的 LostItem 数组
 * @throws 未登录/接口失败时抛 Error
 */
export async function getMyItems(): Promise<LostItem[]> {
  const data = await request<{ posts: BackendPost[] }>('/auth/profile')
  return data.posts.map(mapPost)
}

/**
 * 删除帖子：DELETE /api/v1/posts/:id
 *
 * @param id 帖子 ID
 * @throws 无权删除或接口失败时抛 Error
 */
export async function deletePost(id: number): Promise<void> {
  await request(`/posts/${id}`, { method: 'DELETE' })
}

/**
 * 找回/恢复已被删除或下架的帖子：PATCH /api/v1/posts/:id/recover
 *
 * @param id 帖子 ID
 * @throws 无权操作或接口失败时抛 Error
 */
export async function recoverPost(id: number): Promise<void> {
  await request(`/posts/${id}/recover`, { method: 'PATCH' })
}

/**
 * 后端「收藏 / 取消收藏」的返回结构（snake_case）。
 * 后端两个接口（POST 收藏、DELETE 取消）返回同一形状，只有 favorited 的布尔值不同，
 * 且都是幂等的——重复收藏 / 重复取消不会报错，因此前端可以放心地把返回值当作最终状态。
 */
export interface BackendFavoriteResult {
  post_id: number | string
  favorited: boolean
}

/**
 * 收藏帖子：POST /api/v1/posts/:id/favorite
 *
 * 幂等：已收藏时再调用依然是「已收藏」，不会重复插入收藏记录。
 * @param id 帖子 ID
 * @returns 收藏后的状态（true 表示已收藏），以后端返回为准而非前端自行推断
 * @throws 未登录或接口失败时抛 Error
 */
export async function addFavorite(id: number): Promise<boolean> {
  const result = await request<BackendFavoriteResult>(`/posts/${id}/favorite`, { method: 'POST' })
  return result.favorited
}

/**
 * 取消收藏帖子：DELETE /api/v1/posts/:id/favorite
 *
 * 幂等：未收藏时再调用也不会报错。
 * @param id 帖子 ID
 * @returns 取消后的状态（false 表示未收藏）
 * @throws 未登录或接口失败时抛 Error
 */
export async function removeFavorite(id: number): Promise<boolean> {
  const result = await request<BackendFavoriteResult>(`/posts/${id}/favorite`, { method: 'DELETE' })
  return result.favorited
}

/**
 * 获取当前用户收藏的帖子列表：GET /api/v1/auth/profile（取其 favorites 字段）
 *
 * 后端没有独立的「收藏列表」接口，收藏夹随「我的资料」一起返回，故这里复用同一个接口。
 * 注意：favorites 的元素结构与 posts 完全一致（都是 model.Post），可直接复用 mapPost。
 * @returns 当前用户收藏的 LostItem 数组（后端按收藏时间倒序返回）
 * @throws 未登录/接口失败时抛 Error
 */
export async function getFavoriteItems(): Promise<LostItem[]> {
  const data = await request<{ favorites: BackendPost[] | null }>('/auth/profile')
  // 一条收藏都没有时后端返回的 favorites 是 JSON null（Go 的 nil slice），必须兜底成空数组，
  // 否则后面的 .map 会抛「Cannot read properties of null」。
  return (data.favorites || []).map(mapPost)
}
