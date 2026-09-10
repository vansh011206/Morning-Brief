import { apiClient } from './client'
import type { RawItem } from './types'

export interface GetRawItemsParams {
  connection_id?: number
  limit?: number
}

export const ingestorApi = {
  getRawItems: async (params?: GetRawItemsParams): Promise<RawItem[]> => {
    const res = await apiClient.get<RawItem[]>('/ingestor/raw-items/', {
      params,
    })
    return res.data
  },
}
