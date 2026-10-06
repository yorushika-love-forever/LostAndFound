import { request } from './http'
import type { LocationGroup } from '@/types'

export function getLocations(): Promise<LocationGroup[]> {
  return request<LocationGroup[]>('/geo/locations')
}
