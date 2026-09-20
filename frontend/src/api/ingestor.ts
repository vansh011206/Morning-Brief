import { apiClient } from './client'
import type { RawItem } from './types'

export interface GetRawItemsParams {
  connection_id?: number
  limit?: number
}

export const ingestorApi = {
  getRawItems: async (params?: GetRawItemsParams): Promise<RawItem[]> => {
    try {
      const res = await apiClient.get<any>('/ingestor/raw-items/', {
        params,
      })
      if (Array.isArray(res.data)) return res.data
      if (Array.isArray(res.data?.results)) return res.data.results
      return []
    } catch {
      return []
    }
  },
}
