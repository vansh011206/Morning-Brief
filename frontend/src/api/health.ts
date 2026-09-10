import { apiClient } from './client'
import type { HealthResponse } from './types'

export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const res = await apiClient.get<HealthResponse>('/health/')
    return res.data
  },
}
