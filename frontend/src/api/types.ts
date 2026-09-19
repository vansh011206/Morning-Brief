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
  provider: 'rss' | 'gmail' | 'github' | 'telegram' | 'calendar'
  provider_display: string
  external_account: string
  display_name: string
  is_active: boolean
  status: 'pending' | 'active' | 'error'
  status_display: string
  last_sync_at: string | null
  last_error: string
  total_items_7d: number
  created_at: string
  updated_at: string
}

export type RawItemType = 'news' | 'email' | 'pr' | 'event' | 'bill'

export interface RawItem {
  id: number
  connection: number
  connection_name: string
  connection_provider: string
  external_id: string
  type: RawItemType
  type_display: string
  title: string
  body_snippet: string
  author: string
  source_url: string
  received_at: string
  is_important: boolean | null
  is_spam: boolean
  feedback_score: number
  created_at: string
}

export type DigestSectionKey = 'news' | 'actions' | 'emails' | 'money' | 'events'
export type DigestItemPriority = 'normal' | 'high' | 'urgent'

export interface DigestItem {
  id: number
  digest: number
  raw_item: number | null
  section: DigestSectionKey
  section_display: string
  rank: number
  summary: string
  priority: DigestItemPriority
  priority_display: string
  ai_reason: string
  source_title: string
  source_url: string
  source_name: string
  author: string
  received_at: string
  created_at: string
}

export interface DigestSectionGroup {
  key: DigestSectionKey
  title: string
  count: number
  items: DigestItem[]
}

export interface Digest {
  id: number
  digest_date: string
  status: 'building' | 'ready' | 'delivered' | 'failed'
  status_display: string
  item_count: number
  important_count: number
  llm_cost_cents: number
  delivered_at: string | null
  items: DigestItem[]
  sections: Record<string, DigestSectionGroup>
  created_at: string
  updated_at: string
}

// Alias for backward compatibility
export type DailyDigest = Digest

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface DeliveryLog {
  id: number
  digest: number
  channel: 'email' | 'telegram'
  status: 'pending' | 'sent' | 'failed'
  recipient: string
  sent_at: string | null
  error_message: string
  created_at: string
}

export interface TestBriefResponse {
  status: string
  recipient: string
  message: string
  delivered_at: string
}

export interface HealthResponse {
  status: string
  service: string
  timestamp: string
  version: string
}

export interface ItemFeedbackPayload {
  digest_item: number
  feedback_type: 'helpful' | 'unhelpful' | 'irrelevant' | 'missed_urgent'
}
