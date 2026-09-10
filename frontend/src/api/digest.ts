import { apiClient } from './client'
import type { Digest } from './types'

export const digestApi = {
  getTodayDigest: async (): Promise<Digest> => {
    const res = await apiClient.get<Digest>('/digests/today/')
    return res.data
  },

  generateNow: async (): Promise<Digest> => {
    const res = await apiClient.post<Digest>('/digests/generate-now/')
    return res.data
  },

  getDigests: async (): Promise<Digest[]> => {
    const res = await apiClient.get<Digest[]>('/digests/')
    return res.data
  },

  getDigestById: async (id: number): Promise<Digest> => {
    const res = await apiClient.get<Digest>(`/digests/${id}/`)
    return res.data
  },
}
