import { request, requestAllPages } from './http'
import type { Comment } from '@/types'

interface BackendComment {
  id: number | string
  post_id: number | string
  user_id: number | string
  author_name?: string
  content: string
  created_at: string
}

function mapComment(comment: BackendComment): Comment {
  return {
    id: Number(comment.id),
    postId: Number(comment.post_id),
    userId: Number(comment.user_id),
    // author_name 由后端按 user_id 关联用户表回填（见后端 repository/authorname.go），
    // 缺失时才退回到显示用户 ID。
    authorName: comment.author_name || `用户 ${comment.user_id}`,
    content: comment.content,
    createdAt: comment.created_at,
  }
}

export async function getComments(postId: number): Promise<Comment[]> {
  const list = await requestAllPages<BackendComment>(`/posts/${postId}/comments`)
  return list.map(mapComment)
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
