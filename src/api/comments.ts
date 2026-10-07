/**
 * 帖子评论相关接口：按帖子读取评论、发表评论、删除评论。
 *
 * 使用方：ItemDetailView（帖子详情页的评论区）。
 * 依赖：./http 的 request()/requestAllPages()；评论列表接口挂在帖子下（/posts/:id/comments），
 * 创建/删除评论则挂在 /comments 下。
 * 对外导出：getComments、createComment、deleteComment。
 */
import { request, requestAllPages } from './http'
import type { Comment } from '@/types'

/** 后端评论结构（snake_case，与数据库字段一致）。 */
interface BackendComment {
  id: number | string
  post_id: number | string
  user_id: number | string
  author_name?: string
  content: string
  created_at: string
}

/**
 * 把后端评论映射为前端 Comment（snake_case → camelCase）。
 *
 * @param comment 后端返回的评论
 * @returns 前端 Comment；post_id→postId、user_id→userId、author_name→authorName。
 */
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

/**
 * 获取某帖子的全部评论：GET /api/v1/posts/:postId/comments
 *
 * 后端分页返回，这里自动翻页取全再映射。
 * @param postId 帖子 ID
 * @returns 该帖子的 Comment 数组
 * @throws 帖子不存在或接口失败时抛 Error
 */
export async function getComments(postId: number): Promise<Comment[]> {
  const list = await requestAllPages<BackendComment>(`/posts/${postId}/comments`)
  return list.map(mapComment)
}

/**
 * 发表评论：POST /api/v1/comments
 *
 * @param postId 评论所属帖子 ID
 * @param content 评论正文
 * @returns 新建的 Comment
 * @throws 接口失败时抛 Error(后端 msg)
 */
export async function createComment(postId: number, content: string): Promise<Comment> {
  const data = await request<BackendComment>('/comments', {
    method: 'POST',
    // 提交字段名用后端的 post_id（snake_case），并去掉正文首尾空白。
    body: JSON.stringify({ post_id: postId, content: content.trim() }),
  })
  return mapComment(data)
}

/**
 * 删除评论：DELETE /api/v1/comments/:commentId
 *
 * @param commentId 评论 ID
 * @throws 无权删除或接口失败时抛 Error
 */
export async function deleteComment(commentId: number): Promise<void> {
  await request(`/comments/${commentId}`, { method: 'DELETE' })
}
