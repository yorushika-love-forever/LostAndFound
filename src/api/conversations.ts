/**
 * 会话（私信）与「认领/完结」流程相关接口：会话列表、消息收发、完结申请与审核、发起认领。
 *
 * 使用方：消息/会话页、帖子详情页（点击「联系失主/认领」）、我的认领列表。
 * 依赖：./http 的 request()/requestAllPages()。
 * 后端路由挂在 /conversations 与 /posts/:id/conversations 下。
 * 对外导出：Message 类型及 getConversations、getConversationDetail、getMessages、sendMessage、
 * createFinishRequest、getPendingFinishRequest、reviewFinishRequest、withdrawFinishRequest、
 * createClaim、getMyClaims。
 */
import { request, requestAllPages } from './http'
import type { ClaimApplication, Conversation, FinishRequest, LostItem } from '@/types'

/**
 * 后端会话结构（snake_case）：initiator_id 是发起方，owner_id 是帖子发布者。
 * post_title / post_status / post_is_finished 是后端按 post_id 实时回填的帖子快照
 * （非数据库字段），会话列表与详情接口都会带上；帖子已删除时这些字段为零值。
 */
interface BackendConversation {
  id: number | string
  post_id: number | string
  initiator_id: number | string
  owner_id: number | string
  post_title?: string
  post_status?: Conversation['postStatus']
  post_is_finished?: boolean
  created_at: string
  updated_at: string
}

/** 前端使用的消息结构（camelCase），由 mapMessage 从后端结构转换而来。 */
export interface Message {
  id: number
  conversationId: number
  // 发送方用户 id。为 null 表示「系统消息」——后端在完成寻找申请被发起/同意/拒绝/撤回时
  // 会往会话里写一条留痕，这类消息没有真实发送者。界面据此把它们渲染成居中的灰色提示条，
  // 而不是塞进某一侧的聊天气泡里（否则看起来像是「用户 0」发了一句莫名其妙的话）。
  senderId: number | null
  content: string
  createdAt: string
}

/** 后端消息结构（snake_case）。 */
interface BackendMessage {
  id: number | string
  conversation_id: number | string
  // 系统消息的 sender_id 在数据库里是 NULL，序列化成 JSON 即 null，故类型必须带上 null。
  sender_id: number | string | null
  content: string
  created_at: string
}

/** 后端完结申请结构（snake_case）：status 为 pending/agreed/rejected。 */
interface BackendFinishRequest {
  id: number | string
  conversation_id: number | string
  requester_id: number | string
  status: FinishRequest['status']
  created_at: string
  updated_at: string
}

/**
 * 把后端会话映射为前端 Conversation（snake_case → camelCase）。
 * @param conversation 后端返回的会话
 * @returns 前端 Conversation；post_id→postId、initiator_id→initiatorId、owner_id→ownerId，
 *          帖子快照 post_title/post_status/post_is_finished → postTitle/postStatus/postIsFinished。
 */
function mapConversation(conversation: BackendConversation): Conversation {
  return {
    id: Number(conversation.id),
    postId: Number(conversation.post_id),
    initiatorId: Number(conversation.initiator_id),
    ownerId: Number(conversation.owner_id),
    // 帖子快照字段可能缺失（如建会话接口不回填、帖子已被删除），统一兜底成「空」而不是 undefined。
    postTitle: conversation.post_title || '',
    postStatus: conversation.post_status || '',
    postIsFinished: Boolean(conversation.post_is_finished),
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  }
}

/**
 * 把后端消息映射为前端 Message（snake_case → camelCase）。
 * @param message 后端返回的消息
 * @returns 前端 Message；conversation_id→conversationId、sender_id→senderId。
 */
function mapMessage(message: BackendMessage): Message {
  return {
    id: Number(message.id),
    conversationId: Number(message.conversation_id),
    // 系统消息必须原样保留 null：早前直接写 Number(message.sender_id)，
    // 而 Number(null) === 0，于是系统消息被当成「用户 0 发出的普通消息」渲染在左侧气泡里。
    // 这里先判空再转换，null / undefined 一律映射为 null，交给界面按系统消息处理。
    senderId: message.sender_id === null || message.sender_id === undefined ? null : Number(message.sender_id),
    content: message.content,
    createdAt: message.created_at,
  }
}

/**
 * 把后端完结申请映射为前端 FinishRequest（snake_case → camelCase）。
 * @param request 后端返回的完结申请
 * @returns 前端 FinishRequest；conversation_id→conversationId、requester_id→requesterId。
 */
function mapFinishRequest(request: BackendFinishRequest): FinishRequest {
  return {
    id: Number(request.id),
    conversationId: Number(request.conversation_id),
    requesterId: Number(request.requester_id),
    status: request.status,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  }
}

/**
 * 获取当前用户的会话列表：GET /api/v1/conversations
 * @returns Conversation 数组（自动翻页取全）
 * @throws 未登录/接口失败时抛 Error
 */
export async function getConversations(): Promise<Conversation[]> {
  const list = await requestAllPages<BackendConversation>('/conversations')
  return list.map(mapConversation)
}

/**
 * 获取单个会话详情（含所属帖子的标题/状态/完成情况快照）：GET /api/v1/conversations/:conversationId
 *
 * 仅会话参与方（发起方或帖子作者）可读，其他人后端会按「会话不存在」处理。
 * 聊天页据此展示帖子标题、跳转原帖，并在帖子已完成时隐藏「申请完成寻找」入口——
 * 这正是之前用 getItem 绕路拿标题的替代方案。
 * @param conversationId 会话 ID
 * @returns 带帖子快照的 Conversation
 * @throws 非参与方、会话不存在或接口失败时抛 Error(后端 msg)
 */
export async function getConversationDetail(conversationId: number): Promise<Conversation> {
  return mapConversation(await request<BackendConversation>(`/conversations/${conversationId}`))
}

/**
 * 获取某个会话的全部消息：GET /api/v1/conversations/:conversationId/messages
 * @param conversationId 会话 ID
 * @returns Message 数组
 * @throws 接口失败时抛 Error
 */
export async function getMessages(conversationId: number): Promise<Message[]> {
  const list = await requestAllPages<BackendMessage>(`/conversations/${conversationId}/messages`)
  // 后端按时间正序（旧→新）分页返回；聊天界面通常要从底部开始显示最新消息，
  // 这里 reverse() 成倒序（新→旧），页面渲染时最新的在最上方/底部按约定使用。
  return list.map(mapMessage).reverse()
}

/**
 * 发送一条消息：POST /api/v1/conversations/:conversationId/messages
 * @param conversationId 会话 ID
 * @param content 消息正文（发送前去掉首尾空白）
 * @returns 新建的 Message
 * @throws 接口失败时抛 Error(后端 msg)
 */
export async function sendMessage(conversationId: number, content: string): Promise<Message> {
  return mapMessage(await request<BackendMessage>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content: content.trim() }),
  }))
}

/**
 * 发起「完结申请」：POST /api/v1/conversations/:conversationId/finish-requests
 *
 * 由会话一方发起、请求把该帖子标记为已完成（找回/归还成功），等对方审核。
 * @param conversationId 会话 ID
 * @returns 新建的 FinishRequest（初始 status 为 pending）
 * @throws 接口失败时抛 Error
 */
export async function createFinishRequest(conversationId: number): Promise<FinishRequest> {
  return mapFinishRequest(await request<BackendFinishRequest>(`/conversations/${conversationId}/finish-requests`, { method: 'POST' }))
}

/**
 * 查询会话当前「待处理」的完成寻找申请：GET /api/v1/conversations/:conversationId/finish-requests
 *
 * 为什么必须单独查一次：申请编号（id）只存在于接口返回里，界面上没有任何地方会展示它。
 * 早前页面靠 window.prompt 让用户手输编号，等于这三个操作（同意/拒绝/撤回）根本没法用；
 * 改为进页面就查一次，按钮直接带着查到的 id 调接口。
 *
 * 后端保证同一会话同一时刻最多只有一条 pending 申请，没有时 data 为 null。
 * @param conversationId 会话 ID
 * @returns 待处理的 FinishRequest；没有待处理申请时为 null
 * @throws 非参与方或接口失败时抛 Error(后端 msg)
 */
export async function getPendingFinishRequest(conversationId: number): Promise<FinishRequest | null> {
  // 后端该字段是 *FinishRequest（Go 指针），没有待办申请时序列化成 JSON null。
  // 因此泛型要写成可空，且必须先判空再映射，否则 mapFinishRequest(null) 会读 null.id 直接抛错。
  const data = await request<BackendFinishRequest | null>(`/conversations/${conversationId}/finish-requests`)
  return data ? mapFinishRequest(data) : null
}

/**
 * 审核「完结申请」：PATCH /api/v1/conversations/:conversationId/finish-requests/:requestId
 *
 * @param conversationId 会话 ID
 * @param requestId 完结申请 ID
 * @param status 审核结果，只允许 'agreed'（同意）或 'rejected'（拒绝）
 * @returns 更新后的 FinishRequest
 * @throws 无权审核或接口失败时抛 Error
 */
export async function reviewFinishRequest(conversationId: number, requestId: number, status: 'agreed' | 'rejected'): Promise<FinishRequest> {
  return mapFinishRequest(await request<BackendFinishRequest>(`/conversations/${conversationId}/finish-requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }))
}

/**
 * 撤回「完结申请」：DELETE /api/v1/conversations/:conversationId/finish-requests/:requestId
 *
 * 语义：仅「申请发起方本人」可撤回，且只对仍处于 pending 的申请有效；
 * 撤回只是把该申请软删除并留一条系统消息，帖子本身不受影响。
 * @param conversationId 会话 ID
 * @param requestId 完结申请 ID
 * @throws 非发起方、申请已被同意/拒绝或接口失败时抛 Error(后端 msg)
 */
export async function withdrawFinishRequest(conversationId: number, requestId: number): Promise<void> {
  // 后端成功时返回 data 为 null，这里不需要返回值，故声明为 Promise<void>。
  await request(`/conversations/${conversationId}/finish-requests/${requestId}`, { method: 'DELETE' })
}

/**
 * 发起认领：POST /api/v1/posts/:id/conversations（随后如有说明再发一条消息）
 *
 * 后端没有独立的「认领」接口——认领的本质就是「针对某个帖子新建一个会话」，
 * 因此这里先建会话，再把用户填写的认领理由作为该会话的第一条消息发出去。
 * @param item 被认领的帖子（需要其 id 与 title）
 * @param reason 认领理由，可为空；为空时不发消息
 * @returns 组装好的 ClaimApplication（id 用的是会话 ID）
 * @throws 建会话或发消息失败时抛 Error
 */
export async function createClaim(item: LostItem, reason: string): Promise<ClaimApplication> {
  const conversation = mapConversation(await request<BackendConversation>(`/posts/${item.id}/conversations`, { method: 'POST' }))
  const trimmedReason = reason.trim()
  // 理由为空则跳过发消息，避免产生一条空白消息。
  if (trimmedReason) {
    await request(`/conversations/${conversation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: trimmedReason }),
    })
  }
  return {
    id: conversation.id,
    itemId: item.id,
    itemTitle: item.title,
    reason: trimmedReason,
    // 认领（会话）在后端没有 pending 概念，前端统一视为 'active' 进行中。
    status: 'active',
    createdAt: conversation.createdAt,
  }
}

/**
 * 获取当前用户的认领列表：GET /api/v1/conversations
 *
 * 会话列表接口本身已带上帖子标题快照（post_title），直接取用即可；
 * 不再像以前那样为每条会话再查一次帖子详情（那是没有会话详情接口时的绕路做法）。
 * @returns ClaimApplication 数组（reason 为空，标题取自帖子快照）
 * @throws 会话列表请求失败时抛 Error
 */
export async function getMyClaims(): Promise<ClaimApplication[]> {
  const list = await requestAllPages<BackendConversation>('/conversations')
  return list.map((conversation) => {
    const mapped = mapConversation(conversation)
    return {
      id: mapped.id,
      itemId: mapped.postId,
      // 帖子快照缺失（帖子已删除）时回落到「帖子 #N」，避免列表出现空标题。
      itemTitle: mapped.postTitle || `帖子 #${mapped.postId}`,
      reason: '',
      // as const 让 TS 把字面量收窄成 'active'，匹配 ClaimApplication.status 的联合类型。
      status: 'active' as const,
      createdAt: mapped.createdAt,
    }
  })
}
