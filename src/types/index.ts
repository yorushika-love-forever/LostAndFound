export type ItemType = 'lost' | 'found'
export type ItemStatus = 'pending' | 'approved' | 'rejected'

export interface LostItem {
  id: number
  title: string
  type: ItemType
  description: string
  locationId: string
  location: string
  supplement: string
  imageUrl: string
  status: ItemStatus
  isFinished: boolean
  publisherId: number
  publisherName: string
  createdAt: string
  updatedAt: string
}

export interface ClaimApplication {
  id: number
  itemId: number
  itemTitle: string
  reason: string
  status: 'pending' | 'active'
  createdAt: string
}

export interface Comment {
  id: number
  postId: number
  userId: number
  authorName: string
  content: string
  createdAt: string
}

export interface Conversation {
  id: number
  postId: number
  initiatorId: number
  ownerId: number
  createdAt: string
  updatedAt: string
}

export type FinishRequestStatus = 'pending' | 'agreed' | 'rejected'

export interface FinishRequest {
  id: number
  conversationId: number
  requesterId: number
  status: FinishRequestStatus
  createdAt: string
  updatedAt: string
}

export interface User {
  id: number
  name: string
  studentNo: string
  role: 'student' | 'postadmin' | 'mainadmin'
}

export interface ItemQuery {
  keyword?: string
  type?: ItemType | ''
  location?: string
  finished?: boolean
}

export interface ItemForm {
  title: string
  type: ItemType
  description: string
  locationId: string
  supplement: string
  image: File | null
}

export interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface LocationGroup {
  campus: string
  locations: Location[]
}
