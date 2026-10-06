import { request, requestAllPages } from './http'
import { getItem } from './posts'
import type { ClaimApplication, Conversation, FinishRequest, LostItem } from '@/types'

interface BackendConversation {
  id: number | string
  post_id: number | string
  initiator_id: number | string
  owner_id: number | string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  conversationId: number
  senderId: number
  content: string
  createdAt: string
}

interface BackendMessage {
  id: number | string
  conversation_id: number | string
  sender_id: number | string
  content: string
  created_at: string
}

interface BackendFinishRequest {
  id: number | string
  conversation_id: number | string
  requester_id: number | string
  status: FinishRequest['status']
  created_at: string
  updated_at: string
}

function mapConversation(conversation: BackendConversation): Conversation {
  return {
    id: Number(conversation.id),
    postId: Number(conversation.post_id),
    initiatorId: Number(conversation.initiator_id),
    ownerId: Number(conversation.owner_id),
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  }
}

function mapMessage(message: BackendMessage): Message {
  return {
    id: Number(message.id),
    conversationId: Number(message.conversation_id),
    senderId: Number(message.sender_id),
    content: message.content,
    createdAt: message.created_at,
  }
}

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

export async function getConversations(): Promise<Conversation[]> {
  const list = await requestAllPages<BackendConversation>('/conversations')
  return list.map(mapConversation)
}

export async function getMessages(conversationId: number): Promise<Message[]> {
  const list = await requestAllPages<BackendMessage>(`/conversations/${conversationId}/messages`)
  return list.map(mapMessage).reverse()
}

export async function sendMessage(conversationId: number, content: string): Promise<Message> {
  return mapMessage(await request<BackendMessage>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content: content.trim() }),
  }))
}

export async function createFinishRequest(conversationId: number): Promise<FinishRequest> {
  return mapFinishRequest(await request<BackendFinishRequest>(`/conversations/${conversationId}/finish-requests`, { method: 'POST' }))
}

export async function reviewFinishRequest(conversationId: number, requestId: number, status: 'agreed' | 'rejected'): Promise<FinishRequest> {
  return mapFinishRequest(await request<BackendFinishRequest>(`/conversations/${conversationId}/finish-requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }))
}

export async function createClaim(item: LostItem, reason: string): Promise<ClaimApplication> {
  const conversation = mapConversation(await request<BackendConversation>(`/posts/${item.id}/conversations`, { method: 'POST' }))
  const trimmedReason = reason.trim()
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
    status: 'active',
    createdAt: conversation.createdAt,
  }
}

export async function getMyClaims(): Promise<ClaimApplication[]> {
  const list = await requestAllPages<BackendConversation>('/conversations')
  return Promise.all(list.map(async (conversation) => {
    const mapped = mapConversation(conversation)
    let itemTitle = `帖子 #${mapped.postId}`
    try {
      itemTitle = (await getItem(mapped.postId)).title
    } catch {
      // 已删除或不可见的帖子不应该隐藏这条会话记录。
    }
    return {
      id: mapped.id,
      itemId: mapped.postId,
      itemTitle,
      reason: '',
      status: 'active' as const,
      createdAt: mapped.createdAt,
    }
  }))
}
