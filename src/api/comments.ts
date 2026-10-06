import { request } from './http'
import type { Comment } from '@/types'

interface BackendComment {
  id: number | string
  post_id: number | string
  user_id: number | string
  content: string
  created_at: string
}

interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

function mapComment(comment: BackendComment): Comment {
  return {
    id: Number(comment.id),
    postId: Number(comment.post_id),
    userId: Number(comment.user_id),
    content: comment.content,
    createdAt: comment.created_at,
  }
}

export async function getComments(postId: number): Promise<Comment[]> {
  const data = await request<PageResult<BackendComment>>(`/posts/${postId}/comments?page=1&page_size=100`)
  return data.list.map(mapComment)
}

export async function createComment(postId: number, content: string): Promise<Comment> {
  const data = await request<BackendComment>('/comments', {
    method: 'POST',
    body: JSON.stringify({ post_id: postId, content: content.trim() }),
  })
  return mapComment(data)
}

export async function deleteComment(commentId: number): Promise<void> {
  await request(`/comments/${commentId}`, { method: 'DELETE' })
}
