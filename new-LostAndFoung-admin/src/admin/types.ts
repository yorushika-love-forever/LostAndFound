export type UserRole = 'student' | 'postadmin' | 'mainadmin'

export interface AdminUser {
  id: number | string
  username: string
  name?: string
  nickname?: string
  role: UserRole
  status?: 'active' | 'disabled'
  created_at?: string
  updated_at?: string
}

export type PostType = 'lost' | 'found'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface AdminPost {
  id: number | string
  user_id: number | string
  author_name?: string
  type: PostType
  title: string
  content: string
  image_url?: string | null
  location_id?: string
  location_name?: string
  supplement?: string
  is_finished: boolean
  status: ReviewStatus
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}

// 当前服务器还没有 /admin/claims，因此页面会先显示“后端未开放”。
export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface AdminClaim {
  id: number | string
  post_id: number | string
  post_title?: string
  applicant_name?: string
  description?: string
  status: ClaimStatus
  created_at?: string
}

// 公告接口现在也没有部署。
// 如果后端返回字段不同，只改这里和 api/admin.ts 的映射。
export type AnnouncementStatus = 'draft' | 'published'

export interface AdminAnnouncement {
  id: number | string
  title: string
  content: string
  status: AnnouncementStatus
  admin_id?: number | string
  author_name?: string
  created_at: string
}

export interface PageResult<T> {
  list: T[]
  total: number
  page?: number
  page_size?: number
}

export interface DashboardOverview {
  total_posts: number
  pending_posts: number
  approved_posts: number
  rejected_posts: number
}
