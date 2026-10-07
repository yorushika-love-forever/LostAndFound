/**
 * 地理位置相关接口：获取可选地点列表、按坐标匹配最近地点。
 *
 * 使用方：帖子发布/筛选表单中的地点选择器、发布页的「一键定位最近地点」。
 * 依赖：./http 的 request()；后端路由为 /geo/locations 与 /geo/locate（均公开，无需登录）。
 * 对外导出：getLocations、locateNearest、LocateResult。
 */
import { request } from './http'
import type { Location, LocationGroup } from '@/types'

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

/** 后端定位结果结构（snake_case）。 */
interface BackendLocateResult {
  location: Location
  distance_meters: number
  match_type: LocateResult['matchType']
  supplement: string
}

/**
 * 定位结果（前端 camelCase）。
 * matchType：'manual' 表示按地点 ID 手动选择，'auto' 表示按坐标自动匹配到最近地点。
 */
export interface LocateResult {
  // 匹配到的校园预设地点
  location: Location
  // 与预设地点的直线距离（米）；手动选择时后端恒为 0，只有自动匹配才有意义
  distanceMeters: number
  // 匹配方式：手动选择 / 自动匹配
  matchType: 'manual' | 'auto'
  // 用户填写的补充说明（原样回传）
  supplement: string
}

/**
 * 按经纬度匹配最近的校园预设地点：POST /api/v1/geo/locate
 *
 * 请求体只传 latitude/longitude（两个都传，后端才视为「上报了坐标」并走自动匹配）；
 * 不传 location_id，因为「手动选择」的场景前端下拉框已经能完成，无需再绕一次接口。
 * @param latitude 纬度（来自浏览器定位）
 * @param longitude 经度（来自浏览器定位）
 * @param supplement 可选补充说明，最长 200 字符（后端会校验）
 * @returns LocateResult（matchType 为 'auto'）
 * @throws 坐标系非法（越界或 0,0）或接口失败时抛 Error(后端 msg)
 */
export async function locateNearest(latitude: number, longitude: number, supplement = ''): Promise<LocateResult> {
  const data = await request<BackendLocateResult>('/geo/locate', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude, supplement }),
  })
  return {
    location: data.location,
    distanceMeters: data.distance_meters,
    matchType: data.match_type,
    supplement: data.supplement,
  }
}
