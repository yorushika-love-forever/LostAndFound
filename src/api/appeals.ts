/**
 * 申诉相关接口：提交账号申诉。
 *
 * 使用方：登录/申诉页（被封禁或自愿注销的用户提交申诉）。
 * 依赖：./http 的 request()；后端路由为 /appeals。
 * 注意：这是公开接口，申诉人此时通常尚未登录，因此请求不带（也不依赖）token。
 * 对外导出：AppealReason 类型、createAppeal。
 */
import { request } from './http'

// 申诉原因枚举：self_regret（误操作/反悔）、wrongful_ban（误封）、other（其他）。
export type AppealReason = 'self_regret' | 'wrongful_ban' | 'other'

/**
 * 提交申诉：POST /api/v1/appeals
 *
 * @param input username（申诉账号/学号）、reason（申诉原因枚举）、content（申诉说明）
 * @throws 接口失败（如账号不存在、重复申诉）时抛 Error(后端 msg)
 */
export async function createAppeal(input: { username: string; reason: AppealReason; content: string }): Promise<void> {
  await request('/appeals', {
    method: 'POST',
    // 字段名与后端一致（username/reason/content），无需做 camelCase 转换。
    body: JSON.stringify(input),
  })
}
