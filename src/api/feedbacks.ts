/**
 * 反馈相关接口：登录用户向平台提交意见反馈。
 *
 * 使用方：ProfileView（个人资料页的「意见反馈」面板）。
 * 依赖：./http 的 request()；后端路由为 /feedbacks（POST，需登录）。
 * 对外导出：submitFeedback。
 *
 * 说明：后端提交成功后会把新建的反馈对象回传，但前端只需知道「是否提交成功」，
 * 因此这里不映射响应体、直接返回 void，避免为用不到的数据额外维护类型。
 */
import { request } from './http'

/**
 * 提交一条反馈：POST /api/v1/feedbacks
 *
 * 提交人（user_id）由后端从登录令牌解析，前端只需传正文。
 * @param content 反馈正文（发送前去掉首尾空白，避免提交一堆空格的无效反馈）
 * @throws 未登录、正文为空（后端 binding:"required"）或接口失败时抛 Error(后端 msg)
 */
export async function submitFeedback(content: string): Promise<void> {
  await request('/feedbacks', {
    method: 'POST',
    // 后端接收的字段名就是 content（见 handler/feedback/submit.go 的 SubmitRequest）。
    body: JSON.stringify({ content: content.trim() }),
  })
}
