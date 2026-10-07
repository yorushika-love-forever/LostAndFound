/**
 * utils/format.ts —— 通用格式化工具函数（纯函数、无副作用，可在任意页面复用）。
 * 被谁用：ItemCard 以及各列表/详情页，把后端返回的原始值转成用户看得懂的文字。
 * 依赖：@/types 的 ItemStatus 类型。对外：导出 itemStatusText、formatDate 两个函数。
 */
import type { ItemStatus } from '@/types'

/**
 * 把物品的审核状态码转换成中文文案。
 * @param status 后端返回的状态码（pending / approved / rejected）
 * @returns 对应的中文文字
 */
export function itemStatusText(status: ItemStatus): string {
  // 用「映射对象 + 按键取值」替代 if/switch，写法更紧凑。
  // 因为 status 已被 TS 限定为那三个字面量，键一定存在，不会取到 undefined。
  return {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
  }[status]
}

/**
 * 把后端返回的时间字符串格式化成符合本地习惯的时间文本。
 * @param value 时间字符串（通常是 ISO 8601，如 2026-10-07T12:00:00Z）
 * @returns 本地化的时间字符串；若无法解析则原样返回
 */
export function formatDate(value: string): string {
  const date = new Date(value)
  // Number.isNaN(...) 用来捕获非法时间；此时直接回退成原始字符串，
  // 既不抛错，也避免界面上出现 'Invalid Date' 这种难看的占位。
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
