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

export interface AdminComment {
  id: number | string
  post_id: number | string
  user_id: number | string
  author_name?: string
  content: string
  created_at: string
}

export interface AdminFeedback {
  id: number | string
  user_id: number | string
  author_name?: string
  content: string
  status: string
  created_at: string
  updated_at?: string
}

export interface AdminAppeal {
  id: number | string
  user_id: number | string
  reason: string
  content: string
  status: string
  created_at: string
  updated_at?: string
}

export interface AdminAnnouncement {
  id: number | string
  title: string
  content: string
  admin_id?: number | string
  author_name?: string
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}

export interface PageResult<T> {
  list: T[]
  total: number
  page?: number
  page_size?: number
}

export interface DashboardOverview {
  user_count: number
  post_count: number
  pending_post_count: number
  pending_appeal_count: number
  today_post_count: number
  today_comment_count: number
}
