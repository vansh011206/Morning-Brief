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

export interface TelegramTokenResponse {
  token: string
  bot_username: string
  deep_link: string
  is_bound: boolean
  chat_id?: string | null
  connection?: Connection | null
}

export const connectionsApi = {
  getConnections: async (): Promise<Connection[]> => {
    try {
      const res = await apiClient.get<any>('/connections/')
      if (Array.isArray(res.data)) return res.data
      if (Array.isArray(res.data?.results)) return res.data.results
      return []
    } catch {
      return []
    }
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

  getTelegramToken: async (): Promise<TelegramTokenResponse> => {
    const res = await apiClient.get<TelegramTokenResponse>('/connections/telegram/token/')
    return res.data
  },

  bindTelegram: async (payload: { token?: string; chat_id?: string }): Promise<{
    status: string
    message: string
    chat_id: string
    connection?: Connection
  }> => {
    const res = await apiClient.post<{
      status: string
      message: string
      chat_id: string
      connection?: Connection
    }>('/connections/telegram/bind/', payload)
    return res.data
  },

  getGmailAuthUrl: async (): Promise<{ url: string; auth_url: string }> => {
    const res = await apiClient.get<{ url: string; auth_url: string }>('/connections/gmail/auth-url/')
    return res.data
  },

  getGithubAuthUrl: async (): Promise<{ url: string; auth_url: string }> => {
    const res = await apiClient.get<{ url: string; auth_url: string }>('/connections/github/auth-url/')
    return res.data
  },

  getCalendarAuthUrl: async (): Promise<{ url: string; auth_url: string }> => {
    const res = await apiClient.get<{ url: string; auth_url: string }>('/connections/calendar/auth-url/')
    return res.data
  },
}

