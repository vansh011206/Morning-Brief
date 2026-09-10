import { apiClient } from './client'
import type { Connection } from './types'

export interface CreateConnectionPayload {
  provider?: string
  external_account: string
  display_name?: string
  is_active?: boolean
}

export interface UpdateConnectionPayload {
  is_active?: boolean
  display_name?: string
}

export interface SyncResponse {
  status: string
  message: string
  connection: Connection
  created_count?: number
  existing_count?: number
}

export const connectionsApi = {
  getConnections: async (): Promise<Connection[]> => {
    const res = await apiClient.get<Connection[]>('/connections/')
    return res.data
  },

  createConnection: async (payload: CreateConnectionPayload): Promise<Connection> => {
    const res = await apiClient.post<Connection>('/connections/', {
      provider: payload.provider || 'rss',
      external_account: payload.external_account,
      display_name: payload.display_name || payload.external_account,
      is_active: payload.is_active ?? true,
    })
    return res.data
  },

  updateConnection: async (id: number, payload: UpdateConnectionPayload): Promise<Connection> => {
    const res = await apiClient.patch<Connection>(`/connections/${id}/`, payload)
    return res.data
  },

  deleteConnection: async (id: number): Promise<void> => {
    await apiClient.delete(`/connections/${id}/`)
  },

  triggerSync: async (id: number): Promise<SyncResponse> => {
    const res = await apiClient.post<SyncResponse>(`/connections/${id}/sync/`)
    return res.data
  },
}
