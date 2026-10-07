import { request } from '@/api/http'
import type {
  AdminAnnouncement,
  AdminClaim,
  AdminPost,
  AdminUser,
  AnnouncementStatus,
  ClaimStatus,
  DashboardOverview,
  PageResult,
  ReviewStatus,
  UserRole,
} from '@/admin/types'

export const adminEndpoints = {
  login: '/auth/login',
  profile: '/auth/profile',
  posts: '/posts',
  reviewPost: (id: number | string) => `/posts/${id}/review`,
  postStatus: (id: number | string) => `/admin/posts/${id}/status`,

  claims: '/admin/claims',
  reviewClaim: (id: number | string) => `/admin/claims/${id}/review`,

  announcements: '/announcements',
  adminAnnouncements: '/admin/announcements',
  announcement: (id: number | string) => `/admin/announcements/${id}`,
  announcementStatus: (id: number | string) =>
    `/admin/announcements/${id}/status`,

  users: '/admin/users',
  user: (id: number | string) => `/admin/users/${id}`,
  userStatus: (id: number | string) => `/admin/users/${id}/status`,
  userRole: (id: number | string) => `/admin/users/${id}/role`,

  stats: '/admin/stats',
}

export interface LoginResult {
  access_token?: string
  token?: string
  user: AdminUser
}

export interface ProfileResult {
  user: AdminUser
  posts?: AdminPost[]
}

export function loginApi(username: string, password: string) {
  return request.post<LoginResult>(adminEndpoints.login, {
    username,
    password,
  })
}

export function getProfileApi() {
  return request.get<ProfileResult>(adminEndpoints.profile)
}

export function getPostsApi(params: {
  page: number
  page_size: number
  keyword?: string
  type?: string
  status?: ReviewStatus | ''
}) {
  const query: Record<string, string | number> = {
    page: params.page,
    page_size: params.page_size,
  }

  // 没有选择筛选条件时，就不把参数发给后端。
  if (params.keyword) query.keyword = params.keyword
  if (params.type) query.type = params.type
  if (params.status) query.status = params.status

  return request.get<PageResult<AdminPost>>(adminEndpoints.posts, {params: query,})
}

export function reviewPostApi(
  id: number | string,
  status: 'approved' | 'rejected',
) {
  return request.patch(adminEndpoints.reviewPost(id), { status })
}

export function updatePostStatusApi(
  id: number | string,
  status: ReviewStatus,
) {
  return request.patch(adminEndpoints.postStatus(id), { status })
}

export function getClaimsApi(params: {
  page: number
  page_size: number
  status?: ClaimStatus | ''
}) {
  const query: Record<string, string | number> = {
    page: params.page,
    page_size: params.page_size,
  }

  if (params.status) query.status = params.status
  return request.get<PageResult<AdminClaim>>(adminEndpoints.claims, {params: query,})
}

export function reviewClaimApi(
  id: number | string,
  action: 'approve' | 'reject',
) {
  return request.patch(adminEndpoints.reviewClaim(id), { action })
}

export function getAnnouncementsApi(params: {
  page: number
  page_size: number
}) {
  return request.get<PageResult<AdminAnnouncement>>(
    adminEndpoints.announcements,
    { params },
  )
}

export function createAnnouncementApi(payload: {
  title: string
  content: string
  status: AnnouncementStatus
}, image?: File | null) {
  // 没有手绘图时继续使用原来的 JSON 请求。
  if (!image) {
    return request.post(adminEndpoints.adminAnnouncements, payload)
  }

  // 有手绘图时改发 multipart/form-data。
  // 浏览器会自动生成 Content-Type 的 boundary。
  const body = new FormData()
  body.append('title', payload.title)
  body.append('content', payload.content)
  body.append('status', payload.status)
  body.append('image', image)

  return request.post(adminEndpoints.adminAnnouncements, body)
}

export function updateAnnouncementApi(
  id: number | string,
  payload: { title: string; content: string },
) {
  return request.put(adminEndpoints.announcement(id), payload)
}

export function updateAnnouncementStatusApi(
  id: number | string,
  status: AnnouncementStatus,
) {
  return request.patch(adminEndpoints.announcementStatus(id), { status })
}

export function deleteAnnouncementApi(id: number | string) {
  return request.delete(adminEndpoints.announcement(id))
}

export function getUsersApi(params: {
  page: number
  page_size: number
  keyword?: string
  role?: UserRole | ''
  status?: 'active' | 'disabled' | ''
}) {
  const query: Record<string, string | number> = {
    page: params.page,
    page_size: params.page_size,
  }

  if (params.keyword) query.keyword = params.keyword
  if (params.role) query.role = params.role
  if (params.status) query.status = params.status

  return request.get<PageResult<AdminUser>>(adminEndpoints.users, {
    params: query,
  })
}

export function updateUserStatusApi(
  id: number | string,
  status: 'active' | 'disabled',
) {
  return request.patch(adminEndpoints.userStatus(id), { status })
}

export function updateUserRoleApi(id: number | string, role: UserRole) {
  return request.patch(adminEndpoints.userRole(id), { role })
}

export function deleteUserApi(id: number | string) {
  return request.delete(adminEndpoints.user(id))
}

export function getStatsApi() {
  return request.get<DashboardOverview>(adminEndpoints.stats)
}
