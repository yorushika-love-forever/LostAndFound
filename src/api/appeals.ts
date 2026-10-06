import { request } from './http'

export type AppealReason = 'self_regret' | 'wrongful_ban' | 'other'

export async function createAppeal(input: { username: string; reason: AppealReason; content: string }): Promise<void> {
  await request('/appeals', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
