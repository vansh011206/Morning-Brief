export type DeliveryChannel = 'email' | 'telegram' | 'both'

export interface UserProfile {
  id: number
  timezone: string
  digest_time: string
  delivery_channel: DeliveryChannel
  telegram_chat_id: string | null
  job_hunt_mode: boolean
  digest_enabled: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  email: string
  username: string
  name?: string
  first_name: string
  last_name: string
  phone: string
  profile?: UserProfile
  date_joined: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

export interface RegisterPayload {
  name?: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface PreferencesPayload {
  name?: string
  timezone?: string
  digest_time?: string
  delivery_channel?: DeliveryChannel
  telegram_chat_id?: string | null
  job_hunt_mode?: boolean
  digest_enabled?: boolean
  completed_at?: string | null
}

export interface Connection {
  id: number
  provider: 'gmail' | 'github' | 'telegram' | 'calendar'
  provider_display: string
  account_email: string
  account_username: string
  status: 'active' | 'expired' | 'error' | 'disconnected'
  status_display: string
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'
export type ItemCategory = 'recruiter' | 'security' | 'code_review' | 'action_required' | 'newsletter' | 'general'

export interface DigestItem {
  id: number
  digest: number
  rank: number
  priority: PriorityLevel
  priority_display: string
  category: ItemCategory
  category_display: string
  source: string
  sender: string
  title: string
  summary: string
  action_items: string[]
  external_url: string
  is_read: boolean
  is_archived: boolean
  created_at: string
}

export interface DailyDigest {
  id: number
  date: string
  headline: string
  overview: string
  status: 'queued' | 'generating' | 'ready' | 'delivered' | 'failed'
  status_display: string
  total_items_ranked: number
  items: DigestItem[]
  created_at: string
  updated_at: string
}

export interface HealthResponse {
  status: string
  service: string
  timestamp: string
  version: string
}
