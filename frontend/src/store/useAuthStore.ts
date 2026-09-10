import { create } from 'zustand'
import type { User, AuthTokens } from '../api/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, tokens: AuthTokens) => void
  setTokens: (tokens: AuthTokens) => void
  setAccessToken: (access: string) => void
  setUser: (user: User) => void
  logout: () => void
}

const STORAGE_KEY_ACCESS = 'morningbrief_access_token'
const STORAGE_KEY_REFRESH = 'morningbrief_refresh_token'
const STORAGE_KEY_USER = 'morningbrief_user'

export const useAuthStore = create<AuthState>((set) => {
  const initialAccess = localStorage.getItem(STORAGE_KEY_ACCESS)
  const initialRefresh = localStorage.getItem(STORAGE_KEY_REFRESH)
  const storedUser = localStorage.getItem(STORAGE_KEY_USER)
  const initialUser: User | null = storedUser ? JSON.parse(storedUser) : null

  return {
    user: initialUser,
    accessToken: initialAccess,
    refreshToken: initialRefresh,
    isAuthenticated: Boolean(initialAccess),

    setAuth: (user: User, tokens: AuthTokens) => {
      localStorage.setItem(STORAGE_KEY_ACCESS, tokens.access)
      localStorage.setItem(STORAGE_KEY_REFRESH, tokens.refresh)
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
      set({
        user,
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        isAuthenticated: true,
      })
    },

    setTokens: (tokens: AuthTokens) => {
      localStorage.setItem(STORAGE_KEY_ACCESS, tokens.access)
      localStorage.setItem(STORAGE_KEY_REFRESH, tokens.refresh)
      set({
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        isAuthenticated: true,
      })
    },

    setAccessToken: (access: string) => {
      localStorage.setItem(STORAGE_KEY_ACCESS, access)
      set({ accessToken: access, isAuthenticated: true })
    },

    setUser: (user: User) => {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
      set({ user })
    },

    logout: () => {
      localStorage.removeItem(STORAGE_KEY_ACCESS)
      localStorage.removeItem(STORAGE_KEY_REFRESH)
      localStorage.removeItem(STORAGE_KEY_USER)
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      })
    },
  }
})
