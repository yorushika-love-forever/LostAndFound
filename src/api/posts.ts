import { request } from './http'
import type { ItemForm, ItemQuery, LostItem } from '@/types'

const fallbackImage = '/favicon.ico'

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

interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export function mapPost(post: BackendPost): LostItem {
  return {
    id: Number(post.id),
    title: post.title,
    type: post.type,
    description: post.content,
    locationId: post.location_id || '',
    location: post.location_name || '未填写地点',
    supplement: post.supplement || '',
    imageUrl: post.image_url || fallbackImage,
    status: post.status,
    isFinished: Boolean(post.is_finished),
    publisherId: Number(post.user_id),
    // author_name 由后端按 user_id 关联用户表回填（见后端 repository/authorname.go），
    // 缺失时才退回到显示用户 ID，避免像以前那样永远只显示“用户 1”。
    publisherName: post.author_name || `用户 ${post.user_id}`,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  }
}

export async function getItems(query: ItemQuery = {}): Promise<LostItem[]> {
  const params = new URLSearchParams({ page: '1', page_size: '100' })
  if (query.type) params.append('type', query.type)
  if (query.finished !== undefined) params.set('finished', String(query.finished))
  // 关键词交给后端按标题模糊搜索（后端 GET /posts 的 keyword 参数，SQL 为 title LIKE）。
  const keyword = query.keyword?.trim()
  if (keyword) params.set('keyword', keyword)
  const data = await request<PageResult<BackendPost>>(`/posts?${params.toString()}`)
  // 后端没有地点查询参数，地点筛选只能留在前端。
  const location = query.location?.trim().toLowerCase() || ''
  return data.list.map(mapPost).filter((item) => {
    if (!location) return true
    const searchable = `${item.title}${item.description}${item.location}${item.supplement}`.toLowerCase()
    return searchable.includes(location)
  })
}

export async function getItem(id: number): Promise<LostItem> {
  return mapPost(await request<BackendPost>(`/posts/${id}`))
}

export async function createItem(form: ItemForm): Promise<LostItem> {
  const body = new FormData()
  body.append('type', form.type)
  body.append('title', form.title.trim())
  body.append('content', form.description.trim())
  if (form.image) body.append('image', form.image)
  if (form.locationId) body.append('location_id', form.locationId)
  if (form.supplement.trim()) body.append('supplement', form.supplement.trim())
  return mapPost(await request<BackendPost>('/posts', { method: 'POST', body }))
}

export async function getMyItems(): Promise<LostItem[]> {
  const data = await request<{ posts: BackendPost[] }>('/auth/profile')
  return data.posts.map(mapPost)
}

export async function deletePost(id: number): Promise<void> {
  await request(`/posts/${id}`, { method: 'DELETE' })
}

export async function recoverPost(id: number): Promise<void> {
  await request(`/posts/${id}/recover`, { method: 'PATCH' })
}
