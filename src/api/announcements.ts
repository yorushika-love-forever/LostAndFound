/**
 * 公告相关接口：查看全站公告列表。
 *
 * 使用方：AnnouncementView（公告页）。
 * 依赖：./http 的 requestAllPages()；后端路由为 /announcements（公开接口，未登录也能访问）。
 * 对外导出：getAnnouncements。
 */
import { requestAllPages } from './http'
import type { Announcement } from '@/types'

/** 后端公告结构（snake_case，与公告表字段一致）。 */
interface BackendAnnouncement {
  id: number | string
  admin_id: number | string
  // 发布管理员姓名：后端按 admin_id 关联用户表回填，历史数据可能没有该字段。
  author_name?: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

/**
 * 把后端公告映射为前端 Announcement（snake_case → camelCase）。
 * @param announcement 后端返回的公告
 * @returns 前端 Announcement；author_name→authorName、created_at→createdAt。
 */
function mapAnnouncement(announcement: BackendAnnouncement): Announcement {
  return {
    id: Number(announcement.id),
    title: announcement.title,
    content: announcement.content,
    authorName: announcement.author_name,
    createdAt: announcement.created_at,
  }
}

/**
 * 获取全站公告列表：GET /api/v1/announcements
 *
 * 后端按发布时间倒序分页返回；公告条数可能超过单页上限，
 * 所以用 requestAllPages 循环拉全，避免只显示第一页。
 * @returns Announcement 数组
 * @throws 接口失败时抛 Error(后端 msg)
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  const list = await requestAllPages<BackendAnnouncement>('/announcements')
  return list.map(mapAnnouncement)
}
