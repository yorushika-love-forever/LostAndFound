/**
 * 地理位置相关接口：获取可选地点列表。
 *
 * 使用方：帖子发布/筛选表单中的地点选择器。
 * 依赖：./http 的 request()；后端路由为 /geo/locations。
 * 对外导出：getLocations。
 */
import { request } from './http'
import type { LocationGroup } from '@/types'

/**
 * 获取地点分组列表：GET /api/v1/geo/locations
 *
 * 后端按校区分组返回 { campus, locations: [{ id, name, latitude, longitude }] }[]，
 * 前端直接使用（字段无 snake_case，无需映射）。
 * @returns 地点分组数组 LocationGroup[]
 * @throws 接口失败时抛 Error(后端 msg)
 */
export function getLocations(): Promise<LocationGroup[]> {
  return request<LocationGroup[]>('/geo/locations')
}
