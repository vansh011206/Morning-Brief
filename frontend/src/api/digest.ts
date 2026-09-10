import { apiClient } from './client'
import type { Digest, PaginatedResponse, TestBriefResponse } from './types'

export const digestApi = {
  getTodayDigest: async (): Promise<Digest> => {
    const res = await apiClient.get<Digest>('/digests/today/')
    return res.data
  },

  generateNow: async (deliver: boolean = false): Promise<Digest> => {
    const url = deliver ? '/digests/generate-now/?deliver=1' : '/digests/generate-now/'
    const res = await apiClient.post<Digest>(url)
    return res.data
  },

  getDigests: async (page: number = 1): Promise<PaginatedResponse<Digest>> => {
    const res = await apiClient.get<PaginatedResponse<Digest>>(`/digests/?page=${page}`)
    return res.data
  },

  getDigestById: async (id: number): Promise<Digest> => {
    const res = await apiClient.get<Digest>(`/digests/${id}/`)
    return res.data
  },

  sendTestBrief: async (): Promise<TestBriefResponse> => {
    const res = await apiClient.post<TestBriefResponse>('/delivery/test-brief/')
    return res.data
  },
}

