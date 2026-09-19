import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Digest } from '../../api/types'

export const mockDigest: Digest = {
  id: 1,
  digest_date: '2026-09-19',
  status: 'ready',
  status_display: 'Ready',
  item_count: 3,
  important_count: 1,
  llm_cost_cents: 0.045,
  delivered_at: null,
  items: [
    {
      id: 101,
      digest: 1,
      raw_item: 1,
      section: 'news',
      section_display: 'Technology & World News',
      rank: 1,
      summary: 'Quantum computing lab demonstrates 10,000 qubit coherence.',
      priority: 'normal',
      priority_display: 'Normal',
      ai_reason: 'Major technological advancement in physics',
      source_title: 'Quantum Breakthrough at MIT',
      source_url: 'https://example.com/quantum',
      source_name: 'MIT Tech Review',
      author: 'Tech Reporter',
      received_at: '2026-09-19T08:00:00Z',
      created_at: '2026-09-19T08:05:00Z',
    },
    {
      id: 102,
      digest: 1,
      raw_item: 2,
      section: 'actions',
      section_display: 'Pending Actions & PRs',
      rank: 2,
      summary: 'PR #42 fixes authentication session invalidation bug.',
      priority: 'urgent',
      priority_display: 'Urgent',
      ai_reason: 'Critical security fix awaiting your code review',
      source_title: 'PR #42: Security patch ready for review',
      source_url: 'https://github.com/repo/pull/42',
      source_name: 'GitHub Notifications',
      author: 'octocat',
      received_at: '2026-09-19T07:30:00Z',
      created_at: '2026-09-19T08:05:00Z',
    },
    {
      id: 103,
      digest: 1,
      raw_item: 3,
      section: 'emails',
      section_display: 'Priority Correspondence',
      rank: 3,
      summary: 'Recruiter reaching out regarding Staff Engineer opportunity at Stripe.',
      priority: 'high',
      priority_display: 'High',
      ai_reason: 'Recruiter outreach matching your career preferences',
      source_title: 'Interview Invitation: Staff Engineer',
      source_url: 'https://mail.google.com',
      source_name: 'Google Gmail',
      author: 'recruiting@stripe.com',
      received_at: '2026-09-19T07:00:00Z',
      created_at: '2026-09-19T08:05:00Z',
    },
  ],
  sections: {
    news: {
      key: 'news',
      title: 'Technology & World News',
      count: 1,
      items: [
        {
          id: 101,
          digest: 1,
          raw_item: 1,
          section: 'news',
          section_display: 'Technology & World News',
          rank: 1,
          summary: 'Quantum computing lab demonstrates 10,000 qubit coherence.',
          priority: 'normal',
          priority_display: 'Normal',
          ai_reason: 'Major technological advancement in physics',
          source_title: 'Quantum Breakthrough at MIT',
          source_url: 'https://example.com/quantum',
          source_name: 'MIT Tech Review',
          author: 'Tech Reporter',
          received_at: '2026-09-19T08:00:00Z',
          created_at: '2026-09-19T08:05:00Z',
        },
      ],
    },
    actions: {
      key: 'actions',
      title: 'Pending Actions & PRs',
      count: 1,
      items: [
        {
          id: 102,
          digest: 1,
          raw_item: 2,
          section: 'actions',
          section_display: 'Pending Actions & PRs',
          rank: 2,
          summary: 'PR #42 fixes authentication session invalidation bug.',
          priority: 'urgent',
          priority_display: 'Urgent',
          ai_reason: 'Critical security fix awaiting your code review',
          source_title: 'PR #42: Security patch ready for review',
          source_url: 'https://github.com/repo/pull/42',
          source_name: 'GitHub Notifications',
          author: 'octocat',
          received_at: '2026-09-19T07:30:00Z',
          created_at: '2026-09-19T08:05:00Z',
        },
      ],
    },
    emails: {
      key: 'emails',
      title: 'Priority Correspondence',
      count: 1,
      items: [
        {
          id: 103,
          digest: 1,
          raw_item: 3,
          section: 'emails',
          section_display: 'Priority Correspondence',
          rank: 3,
          summary: 'Recruiter reaching out regarding Staff Engineer opportunity at Stripe.',
          priority: 'high',
          priority_display: 'High',
          ai_reason: 'Recruiter outreach matching your career preferences',
          source_title: 'Interview Invitation: Staff Engineer',
          source_url: 'https://mail.google.com',
          source_name: 'Google Gmail',
          author: 'recruiting@stripe.com',
          received_at: '2026-09-19T07:00:00Z',
          created_at: '2026-09-19T08:05:00Z',
        },
      ],
    },
  },
  created_at: '2026-09-19T08:05:00Z',
  updated_at: '2026-09-19T08:05:00Z',
}

export const mockConnections = [
  {
    id: 1,
    provider: 'rss',
    provider_display: 'RSS Feed',
    external_account: 'https://hnrss.org/frontpage',
    display_name: 'Hacker News',
    is_active: true,
    status: 'active',
    status_display: 'Active',
    last_sync_at: '2026-09-19T08:00:00Z',
    last_error: '',
    total_items_7d: 42,
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-19T08:00:00Z',
  },
  {
    id: 2,
    provider: 'gmail',
    provider_display: 'Google Gmail',
    external_account: 'alex@morningbrief.dev',
    display_name: 'Gmail (alex@morningbrief.dev)',
    is_active: true,
    status: 'active',
    status_display: 'Active',
    last_sync_at: '2026-09-19T08:15:00Z',
    last_error: '',
    total_items_7d: 18,
    created_at: '2026-09-12T00:00:00Z',
    updated_at: '2026-09-19T08:15:00Z',
  },
  {
    id: 3,
    provider: 'telegram',
    provider_display: 'Telegram',
    external_account: '123456789',
    display_name: 'Telegram Bot',
    is_active: true,
    status: 'active',
    status_display: 'Active',
    last_sync_at: null,
    last_error: '',
    total_items_7d: 0,
    created_at: '2026-09-14T00:00:00Z',
    updated_at: '2026-09-14T00:00:00Z',
  },
]

export const handlers = [
  // Today's digest
  http.get('/api/v1/digests/today/', () => {
    return HttpResponse.json(mockDigest)
  }),

  // Generate now
  http.post('/api/v1/digests/generate-now/', () => {
    return HttpResponse.json(mockDigest, { status: 201 })
  }),

  // Archive paginated digests
  http.get('/api/v1/digests/', ({ request }) => {
    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    return HttpResponse.json({
      count: 12,
      next: page === '1' ? '/api/v1/digests/?page=2' : null,
      previous: page === '2' ? '/api/v1/digests/?page=1' : null,
      results: [mockDigest],
    })
  }),

  // Feedback submission
  http.post('/api/v1/feedback/', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 99,
      digest_item: (body as any).digest_item,
      feedback_type: (body as any).feedback_type,
      created_at: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Connections list
  http.get('/api/v1/connections/', () => {
    return HttpResponse.json(mockConnections)
  }),

  // Telegram token
  http.get('/api/v1/connections/telegram/token/', () => {
    return HttpResponse.json({
      token: 'mock_tg_token_xyz',
      bot_username: 'MorningBriefBot',
      deep_link: 'https://t.me/MorningBriefBot?start=mock_tg_token_xyz',
      is_bound: true,
      chat_id: '123456789',
    })
  }),

  // Telegram bind
  http.post('/api/v1/connections/telegram/bind/', () => {
    return HttpResponse.json({
      status: 'active',
      message: 'Telegram account successfully linked.',
      chat_id: '123456789',
    })
  }),
]

export const server = setupServer(...handlers)
