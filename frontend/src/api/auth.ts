import { apiClient } from './client'
import type {
  AuthResponse,
  AuthTokens,
  User,
  UserProfile,
  LoginPayload,
  RegisterPayload,
  PreferencesPayload,
} from './types'

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/auth/login/', payload)
    return res.data
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register/', payload)
    return res.data
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me/')
    return res.data
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.patch<User>('/auth/me/', data)
    return res.data
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/auth/me/')
  },

  getPreferences: async (): Promise<UserProfile> => {
    const res = await apiClient.get<UserProfile>('/auth/me/preferences/')
    return res.data
  },

  updatePreferences: async (data: PreferencesPayload): Promise<User> => {
    const res = await apiClient.patch<User>('/auth/me/preferences/', data)
    return res.data
  },

  logout: async (refresh: string): Promise<void> => {
    await apiClient.post('/auth/logout/', { refresh })
  },
}
