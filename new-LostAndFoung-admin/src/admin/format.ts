import type {
  ReviewStatus,
  UserRole,
} from '@/admin/types'

export function formatDate(value?: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('zh-CN')
}

export function postStatusText(status: ReviewStatus) {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
  return '待审核'
}

export function roleText(role: UserRole) {
  if (role === 'mainadmin') return '系统管理员'
  if (role === 'postadmin') return '失物招领管理员'
  return '学生'
}
