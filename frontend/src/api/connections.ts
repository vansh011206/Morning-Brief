import { apiClient } from './client'
import type { Connection } from './types'

export const connectionsApi = {
  getConnections: async (): Promise<Connection[]> => {
    const res = await apiClient.get<Connection[]>('/connections/')
    return res.data
  },

  triggerSync: async (id: number): Promise<{ status: string; message: string; last_synced_at: string }> => {
    const res = await apiClient.post<{ status: string; message: string; last_synced_at: string }>(
      `/connections/${id}/sync/`
    )
    return res.data
  },

  disconnect: async (id: number): Promise<void> => {
    await apiClient.delete(`/connections/${id}/`)
  },
}
