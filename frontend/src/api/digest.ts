import { apiClient } from './client'
import type { DailyDigest } from './types'

export const digestApi = {
  getTodayDigest: async (): Promise<DailyDigest> => {
    const res = await apiClient.get<DailyDigest>('/digest/today/')
    return res.data
  },

  getDigests: async (): Promise<DailyDigest[]> => {
    const res = await apiClient.get<DailyDigest[]>('/digest/')
    return res.data
  },

  getDigestById: async (id: number): Promise<DailyDigest> => {
    const res = await apiClient.get<DailyDigest>(`/digest/${id}/`)
    return res.data
  },

  toggleRead: async (itemId: number): Promise<{ id: number; is_read: boolean }> => {
    const res = await apiClient.post<{ id: number; is_read: boolean }>(`/digest/items/${itemId}/toggle-read/`)
    return res.data
  },

  toggleArchive: async (itemId: number): Promise<{ id: number; is_archived: boolean }> => {
    const res = await apiClient.post<{ id: number; is_archived: boolean }>(`/digest/items/${itemId}/toggle-archive/`)
    return res.data
  },

  triggerGenerate: async (): Promise<{ status: string; message: string; digest_id: number }> => {
    const res = await apiClient.post<{ status: string; message: string; digest_id: number }>('/digest/generate/')
    return res.data
  },
}
