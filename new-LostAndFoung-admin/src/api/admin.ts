import { request } from '@/api/http'
import type {
  AdminAnnouncement,
  AdminAppeal,
  AdminComment,
  AdminFeedback,
  AdminPost,
  AdminUser,
  DashboardOverview,
  PageResult,
  ReviewStatus,
} from '@/admin/types'

export const adminEndpoints = {
  login: '/auth/login',
  profile: '/auth/profile',
  posts: '/posts',
  reviewPost: (id: number | string) => `/posts/${id}/review`,
  postStatus: (id: number | string) => `/admin/posts/${id}/status`,
  postFinished: (id: number | string) => `/admin/posts/${id}/finished`,
  deletedPosts: '/admin/posts/deleted',
  recoverPost: (id: number | string) => `/posts/${id}/recover`,
  reviews: '/admin/reviews',

  comments: (postId: number | string) => `/posts/${postId}/comments`,
  comment: (id: number | string) => `/comments/${id}`,

  feedbacks: '/admin/feedbacks',
  reviewFeedback: (id: number | string) =>
    `/admin/feedbacks/${id}/review`,

  announcements: '/announcements',
  adminAnnouncements: '/admin/announcements',
  announcement: (id: number | string) => `/admin/announcements/${id}`,

  users: '/admin/users',
  user: (id: number | string) => `/admin/users/${id}`,
  recoverUser: (id: number | string) => `/admin/users/${id}/recover`,
  reviewAppeal: (id: number | string) => `/admin/appeals/${id}/review`,

  adminCount: '/admin/count',
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

  return request.get<PageResult<AdminPost>>(adminEndpoints.posts, {
    params: query,
  })
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

export function updatePostFinishedApi(
  id: number | string,
  finished: boolean,
) {
  return request.patch(adminEndpoints.postFinished(id), { finished })
}

export function getDeletedPostsApi(params: {
  page: number
  page_size: number
}) {
  return request.get<PageResult<AdminPost>>(adminEndpoints.deletedPosts, {
    params,
  })
}

export function recoverPostApi(id: number | string) {
  return request.patch(adminEndpoints.recoverPost(id))
}

export function getPostCommentsApi(postId: number | string) {
  return request.get<PageResult<AdminComment>>(
    adminEndpoints.comments(postId),
    {
      params: {
        page: 1,
        page_size: 100,
      },
    },
  )
}

export function deleteCommentApi(id: number | string) {
  return request.delete(adminEndpoints.comment(id))
}

export function getFeedbacksApi(params: {
  page: number
  page_size: number
}) {
  return request.get<PageResult<AdminFeedback>>(adminEndpoints.feedbacks, {
    params,
  })
}

export function reviewFeedbackApi(
  id: number | string,
  status: 'approved' | 'rejected',
) {
  return request.patch(adminEndpoints.reviewFeedback(id), { status })
}

export function reviewAppealApi(
  id: number | string,
  status: 'approved' | 'rejected',
) {
  return request.patch(adminEndpoints.reviewAppeal(id), { status })
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
  body.append('image', image)

  return request.post(adminEndpoints.adminAnnouncements, body)
}

export function deleteAnnouncementApi(id: number | string) {
  return request.delete(adminEndpoints.announcement(id))
}

export function deleteUserApi(id: number | string) {
  return request.delete(adminEndpoints.user(id))
}

export function recoverUserApi(id: number | string) {
  return request.patch(adminEndpoints.recoverUser(id))
}

export interface PendingReviewResult {
  posts: AdminPost[]
  appeals: AdminAppeal[]
}

export function getPendingReviewsApi() {
  return request.get<PendingReviewResult>(adminEndpoints.reviews)
}

export function getAdminCountApi() {
  return request.get<DashboardOverview>(adminEndpoints.adminCount)
}
