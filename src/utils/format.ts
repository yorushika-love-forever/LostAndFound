import type { ItemStatus } from '@/types'

export function itemStatusText(status: ItemStatus): string {
  return {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
  }[status]
}

export function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
