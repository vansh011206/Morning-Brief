import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Rss,
  Mail,
  Github,
  Send,
  Calendar,
  RefreshCw,
  Plus,
  Unlink,
  ShieldCheck,
  AlertCircle,
  Radio,
  Layers,
  Copy,
  Check,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Modal,
  Input,
  Switch,
  Skeleton,
  EmptyState,
} from '../components/ui'
import { connectionsApi, type CreateConnectionPayload } from '../api/connections'
import type { Connection } from '../api/types'
import { useToastStore } from '../store/useToastStore'

function formatSyncTime(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  try {
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}d ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'Recently'
  }
}

export const ConnectionsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { addToast } = useToastStore()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [feedName, setFeedName] = useState('')
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const { data: telegramData } = useQuery({
    queryKey: ['telegramToken'],
    queryFn: connectionsApi.getTelegramToken,
    enabled: isTelegramModalOpen,
  })

  // Fetch live connections
  const { data: connections = [], isLoading, isError, refetch } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: connectionsApi.getConnections,
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      connectionsApi.updateConnection(id, { is_active }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Connection[]>(['connections'], (old = []) =>
        old.map((c) => (c.id === updated.id ? updated : c))
      )
      addToast({
        type: 'info',
        title: updated.is_active ? 'Feed Activated' : 'Feed Paused',
        description: `'${updated.display_name}' ${updated.is_active ? 'will be included' : 'paused'
          } in scheduled briefings.`,
      })
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: err.response?.data?.detail || 'Could not update feed status.',
      })
    },
  })

  // Add custom feed mutation
  const addFeedMutation = useMutation({
    mutationFn: (payload: CreateConnectionPayload) => connectionsApi.createConnection(payload),
    onSuccess: (newConn) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['rawItems'] })
      setIsAddModalOpen(false)
      setFeedUrl('')
      setFeedName('')
      addToast({
        type: 'success',
        title: 'Feed Subscribed',
        description: `Successfully added '${newConn.display_name}'. Ingestion pipeline started.`,
      })
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Subscription Failed',
        description:
          err.response?.data?.external_account?.[0] ||
          err.response?.data?.non_field_errors?.[0] ||
          'Failed to add custom RSS feed. Please check the URL.',
      })
    },
  })

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: (id: number) => connectionsApi.triggerSync(id),
    onMutate: (id) => {
      setSyncingId(id)
    },
    onSuccess: (res) => {
      setSyncingId(null)
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['rawItems'] })
      addToast({
        type: 'success',
        title: 'Sync Completed',
        description: `${res.message} (${res.created_count || 0} new items).`,
      })
    },
    onError: (err: any) => {
      setSyncingId(null)
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      addToast({
        type: 'error',
        title: 'Sync Error',
        description: err.response?.data?.message || 'Could not fetch entries from source.',
      })
    },
  })

  // Disconnect / Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => connectionsApi.deleteConnection(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Connection[]>(['connections'], (old = []) =>
        old.filter((c) => c.id !== id)
      )
      queryClient.invalidateQueries({ queryKey: ['rawItems'] })
      setDeleteConfirmId(null)
      addToast({
        type: 'warning',
        title: 'Feed Disconnected',
        description: 'Connection and associated raw briefing items removed.',
      })
    },
    onError: () => {
      setDeleteConfirmId(null)
      addToast({
        type: 'error',
        title: 'Disconnect Failed',
        description: 'Failed to disconnect channel. Please try again.',
      })
    },
  })

  const rssConnections = connections.filter((c) => c.provider === 'rss')

  const handleAddFeedSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedUrl.trim()) return
    addFeedMutation.mutate({
      provider: 'rss',
      external_account: feedUrl.trim(),
      display_name: feedName.trim() || undefined,
    })
  }

  return (
    <div className="w-full space-y-10 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900 tracking-tight">
              Data Ingestion Channels
            </h1>
            <Badge variant="indigo" size="md">
              Live Pipeline
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Manage active RSS feeds and external data sources for automated morning briefing synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Custom Feed
          </Button>
        </div>
      </div>

      {/* SECTION 1: Active RSS News & Interest Feeds */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-lg text-zinc-900">
              Live RSS News & Interest Feeds
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            Polled every 30m via Celery Beat
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-[20px] border border-zinc-200/80 bg-white space-y-4 shadow-xs">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="p-6 rounded-[20px] border border-zinc-200/80 bg-white space-y-4 shadow-xs">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ) : isError ? (
          <div className="p-6 rounded-[20px] border border-rose-200 bg-rose-50/50 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose mx-auto" />
            <p className="text-sm font-semibold text-rose-900">
              Failed to load connected feeds.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : rssConnections.length === 0 ? (
          <EmptyState
            icon={<Rss className="w-6 h-6" />}
            title="No Active RSS Feeds"
            description="Subscribe to technology blogs, news portals, or market updates to fuel your morning digest."
            action={
              <Button
                variant="primary"
                onClick={() => setIsAddModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Your First Feed
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rssConnections.map((conn) => {
              const isSyncing = syncingId === conn.id
              const isErrorState = conn.status === 'error'

              return (
                <Card
                  key={conn.id}
                  className={`flex flex-col justify-between transition-all border ${isErrorState
                      ? 'border-rose-200 shadow-rose-50/50'
                      : !conn.is_active
                        ? 'opacity-70 bg-zinc-50/60'
                        : 'hover:border-zinc-300'
                    }`}
                >
                  <div>
                    <CardHeader className="py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                          <Rss className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {conn.display_name}
                          </CardTitle>
                          <a
                            href={conn.external_account}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-mono text-zinc-400 hover:text-primary truncate block transition-colors"
                            title={conn.external_account}
                          >
                            {conn.external_account}
                          </a>
                        </div>
                      </div>

                      {/* Status pill */}
                      <div>
                        {conn.status === 'active' ? (
                          <Badge variant="emerald" dot size="sm">
                            Active · {formatSyncTime(conn.last_sync_at)}
                          </Badge>
                        ) : conn.status === 'pending' ? (
                          <Badge variant="amber" dot size="sm">
                            Pending Sync
                          </Badge>
                        ) : (
                          <Badge variant="rose" dot size="sm">
                            Fetch Error
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="py-2.5 space-y-3">
                      {/* Metric Chip & Switch */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-zinc-400" />
                          <span className="text-xs font-medium text-zinc-600">
                            7-Day Ingestion:
                          </span>
                          <Badge variant="indigo" size="sm">
                            {conn.total_items_7d} items
                          </Badge>
                        </div>

                        <Switch
                          checked={conn.is_active}
                          onChange={(checked) =>
                            toggleActiveMutation.mutate({ id: conn.id, is_active: checked })
                          }
                          label={conn.is_active ? 'Active' : 'Paused'}
                        />
                      </div>

                      {/* Error Banner with Retry */}
                      {isErrorState && (
                        <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <AlertCircle className="w-4 h-4 text-rose shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-semibold">Last sync failed</p>
                              <p className="text-[11px] text-rose-700/90 truncate max-w-xs">
                                {conn.last_error || 'Network error fetching feed.'}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose hover:bg-rose-100 text-xs shrink-0 h-7 px-2"
                            onClick={() => syncMutation.mutate(conn.id)}
                            isLoading={isSyncing}
                          >
                            Retry
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </div>

                  <CardFooter className="py-3 px-5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isSyncing}
                      onClick={() => syncMutation.mutate(conn.id)}
                      leftIcon={
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                        />
                      }
                    >
                      Sync Now
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(conn.id)}
                      className="text-rose hover:bg-rose-50 hover:text-rose text-xs"
                    >
                      <Unlink className="w-3.5 h-3.5 mr-1" />
                      Disconnect
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: OAuth Workspace Channels */}
      <div className="space-y-4 pt-4 border-t border-zinc-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-lg text-zinc-900">
              Workspace Communications Channels
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Secure OAuth integrations for personal morning briefing compilation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* --- GitHub Card (Live OAuth) --- */}
          {(() => {
            const githubConn = connections.find((c) => c.provider === 'github')
            const isGithubConnected = !!githubConn
            const isGithubSyncing = githubConn ? syncingId === githubConn.id : false
            const isGithubError = githubConn?.status === 'error'

            return (
              <div className="rounded-[20px] border border-zinc-200/80 bg-white shadow-xs flex flex-col justify-between overflow-hidden transition-all hover:shadow-md hover:-translate-y-[1px] duration-200 h-full">
                <div className="p-5 pb-4 space-y-3.5">
                  {/* Header: Icon + Title */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white shadow-sm flex items-center justify-center shrink-0">
                      <Github className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-zinc-900 truncate">GitHub</h3>
                      <span className="text-xs font-mono text-zinc-400">OAuth 2.0</span>
                    </div>
                  </div>

                  {/* Status row: Moved below title */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs font-medium text-zinc-500">Service Status</span>
                    {isGithubConnected ? (
                      isGithubError ? (
                        <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Error
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Connected
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                        Not Connected
                      </span>
                    )}
                  </div>

                  {/* Content / Info Box */}
                  <div className="space-y-3">
                    {isGithubConnected && isGithubError ? (
                      <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" strokeWidth={1.75} />
                        <div className="min-w-0">
                          <p className="font-semibold">Token expired or revoked</p>
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            {githubConn?.last_error || 'Please disconnect and reconnect your GitHub account.'}
                          </p>
                        </div>
                      </div>
                    ) : isGithubConnected ? (
                      <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50/80 p-3 rounded-xl border border-emerald-100">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">Connected: {githubConn?.display_name || githubConn?.external_account}</p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Monitoring pull requests, reviews, and CI status.
                            {githubConn?.last_sync_at && ` Last sync: ${formatSyncTime(githubConn.last_sync_at)}`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                        <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                        <span className="leading-relaxed">
                          Reviews assigned pull requests, repository mentions, and CI build status.
                        </span>
                      </div>
                    )}

                    {/* Privacy microcopy */}
                    <p className="text-[12px] text-zinc-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      Read-only access. Your code stays private.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="py-3 px-5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
                  {isGithubConnected ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(githubConn!.id)}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
                    >
                      <Unlink className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                      Disconnect
                    </Button>
                  ) : (
                    <span className="text-xs text-zinc-400">OAuth 2.0</span>
                  )}

                  <div className="flex items-center gap-2">
                    {isGithubConnected && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={isGithubSyncing}
                        onClick={() => githubConn && syncMutation.mutate(githubConn.id)}
                        leftIcon={
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isGithubSyncing ? 'animate-spin' : ''}`}
                            strokeWidth={1.75}
                          />
                        }
                        className="h-9 rounded-xl"
                      >
                        Sync Now
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant={isGithubConnected ? 'outline' : 'primary'}
                      className={isGithubConnected ? 'h-9 rounded-xl' : 'h-9 rounded-xl shadow-indigo'}
                      onClick={async () => {
                        try {
                          const data = await connectionsApi.getGithubAuthUrl()
                          const targetUrl = data?.url || data?.auth_url
                          if (targetUrl) {
                            window.location.href = targetUrl
                          } else {
                            addToast({
                              type: 'error',
                              title: 'OAuth Error',
                              description: 'No authorization URL received from server.',
                            })
                          }
                        } catch (err: any) {
                          addToast({
                            type: 'error',
                            title: 'OAuth Error',
                            description: err?.response?.data?.error || 'Failed to initiate GitHub OAuth flow.',
                          })
                        }
                      }}
                    >
                      {isGithubConnected ? 'Reconnect' : 'Connect GitHub'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* --- Gmail Card (Live OAuth) --- */}
          {(() => {
            const gmailConn = connections.find((c) => c.provider === 'gmail')
            const isGmailConnected = !!gmailConn

            return (
              <div className="rounded-[20px] border border-zinc-200/80 bg-white shadow-xs flex flex-col justify-between overflow-hidden transition-all hover:shadow-md hover:-translate-y-[1px] duration-200 h-full">
                <div className="p-5 pb-4 space-y-3.5">
                  {/* Header: Icon + Title */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-rose-600" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-zinc-900 truncate">Google Gmail</h3>
                      <span className="text-xs font-mono text-zinc-400">OAuth 2.0</span>
                    </div>
                  </div>

                  {/* Status row: Moved below title */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs font-medium text-zinc-500">Service Status</span>
                    {gmailConn ? (
                      gmailConn.status === 'active' ? (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Active · Connected
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Fetch Error
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                        Not Connected
                      </span>
                    )}
                  </div>

                  {/* Content / Info Box */}
                  <div className="space-y-3">
                    {gmailConn && gmailConn.status === 'error' ? (
                      <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" strokeWidth={1.75} />
                        <div className="min-w-0">
                          <p className="font-semibold">Insufficient Permissions</p>
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            {gmailConn.last_error || 'Gmail scope missing. Please disconnect and reconnect.'}
                          </p>
                        </div>
                      </div>
                    ) : isGmailConnected ? (
                      <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50/80 p-3 rounded-xl border border-emerald-100">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">Connected: {gmailConn?.display_name || gmailConn?.external_account}</p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Actively monitored for executive morning summaries.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                        <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                        <span className="leading-relaxed">Read-only access to email headers and snippets. Detects recruiter outreach and urgent notices.</span>
                      </div>
                    )}

                    {/* Privacy microcopy */}
                    <p className="text-[12px] text-zinc-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      Read-only access to headers. Your inbox stays private.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="py-3 px-5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                  {isGmailConnected ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(gmailConn!.id)}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
                    >
                      <Unlink className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                      Disconnect
                    </Button>
                  ) : (
                    <span>OAuth 2.0</span>
                  )}

                  <Button
                    size="sm"
                    variant={isGmailConnected ? 'outline' : 'primary'}
                    className={isGmailConnected ? 'h-9 rounded-xl' : 'h-9 rounded-xl shadow-indigo'}
                    onClick={async () => {
                      try {
                        const data = await connectionsApi.getGmailAuthUrl()
                        const targetUrl = data?.url || data?.auth_url
                        if (targetUrl) {
                          window.location.href = targetUrl
                        } else {
                          addToast({
                            type: 'error',
                            title: 'OAuth Error',
                            description: 'No authorization URL received from server.',
                          })
                        }
                      } catch (err: any) {
                        addToast({
                          type: 'error',
                          title: 'OAuth Error',
                          description: err?.response?.data?.error || 'Failed to initiate Google login flow.',
                        })
                      }
                    }}
                  >
                    {isGmailConnected ? 'Reconnect Gmail' : 'Connect Gmail'}
                  </Button>
                </div>
              </div>
            )
          })()}

          {/* --- Telegram Card (Live) --- */}
          {(() => {
            return (
              <div className="rounded-[20px] border border-zinc-200/80 bg-white shadow-xs flex flex-col justify-between overflow-hidden transition-all hover:shadow-md hover:-translate-y-[1px] duration-200 h-full">
                <div className="p-5 pb-4 space-y-3.5">
                  {/* Header: Icon + Title */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                      <Send className="w-6 h-6 text-sky-600" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-zinc-900 truncate">Telegram Messenger</h3>
                      <span className="text-xs font-mono text-zinc-400">Bot Webhook</span>
                    </div>
                  </div>

                  {/* Status row: Moved below title */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs font-medium text-zinc-500">Service Status</span>
                    {telegramData?.is_bound ? (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Bot Linked
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                        Not Connected
                      </span>
                    )}
                  </div>

                  {/* Content / Info Box */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                      <span className="leading-relaxed">Instant morning brief delivery and priority alerts sent directly to your Telegram chat.</span>
                    </div>

                    {/* Privacy microcopy */}
                    <p className="text-[12px] text-zinc-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      Direct bot notifications. Disconnect anytime.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="py-3 px-5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                  <span>Bot Webhook</span>
                  <Button
                    size="sm"
                    variant={telegramData?.is_bound ? 'outline' : 'primary'}
                    className={telegramData?.is_bound ? 'h-9 rounded-xl' : 'h-9 rounded-xl shadow-indigo'}
                    onClick={() => setIsTelegramModalOpen(true)}
                  >
                    {telegramData?.is_bound ? 'Manage Bot' : 'Connect Bot'}
                  </Button>
                </div>
              </div>
            )
          })()}

          {/* --- Google Calendar Card (Roadmap) --- */}
          <div className="rounded-[20px] border border-zinc-200/80 bg-white shadow-xs flex flex-col justify-between overflow-hidden transition-all hover:shadow-md hover:-translate-y-[1px] duration-200 h-full">
            <div className="p-5 pb-4 space-y-3.5">
              {/* Header: Icon + Title */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-amber-600" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-zinc-900 truncate">Google Calendar</h3>
                  <span className="text-xs font-mono text-zinc-400">Calendar API</span>
                </div>
              </div>

              {/* Status row: Moved below title */}
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-xs font-medium text-zinc-500">Service Status</span>
                <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Coming Soon
                </span>
              </div>

              {/* Content / Info Box */}
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="leading-relaxed">Synthesizes upcoming meetings, agenda items, and schedule conflicts into your morning digest.</span>
                </div>

                {/* Privacy microcopy */}
                <p className="text-[12px] text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                  Roadmap feature. In active development.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="py-3 px-5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
              <span>Calendar API</span>
              <Button size="sm" variant="ghost" className="h-9 rounded-xl">
                Preview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Link Modal */}
      <Modal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        title="Link Telegram Bot"
        description="Connect MorningBrief bot to receive your daily briefings and priority alerts directly on Telegram."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
              Bot Connection Link
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                readOnly
                value={telegramData?.deep_link || 'Loading link...'}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="copy-telegram-link"
                onClick={() => {
                  if (telegramData?.deep_link) {
                    navigator.clipboard?.writeText(telegramData.deep_link)
                    setCopiedLink(true)
                    setTimeout(() => setCopiedLink(false), 2000)
                  }
                }}
                leftIcon={copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedLink ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-600 space-y-1">
            <p className="font-semibold text-zinc-800">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-500">
              <li>Click Copy or Open Telegram below</li>
              <li>Press "Start" in Telegram to bind your chat ID</li>
              <li>Your daily brief will arrive each morning at your configured time</li>
            </ol>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTelegramModalOpen(false)}
            >
              Close
            </Button>
            {telegramData?.deep_link && (
              <a
                href={telegramData.deep_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl font-semibold text-xs h-9 px-4 bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-indigo hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] transition-all"
              >
                Open Telegram
              </a>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Custom Feed Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Subscribe to RSS Feed"
        description="Enter the URL of any valid RSS, Atom, or XML feed to ingest articles into your morning digest."
      >
        <form onSubmit={handleAddFeedSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
              Feed URL
            </label>
            <Input
              type="url"
              placeholder="https://example.com/feed.xml or https://hnrss.org/frontpage"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
              Feed Title / Display Label (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Technology News Weekly"
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={addFeedMutation.isPending}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Subscribe & Ingest
            </Button>
          </div>
        </form>
      </Modal>

      {/* Disconnect Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Disconnect Feed Source?"
        description="Disconnecting this feed will permanently remove all associated raw ingested items and stop scheduled polling."
      >
        <div className="pt-4 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteConfirmId(null)}
          >
            Keep Connected
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            leftIcon={<Unlink className="w-4 h-4" />}
          >
            Confirm Disconnect
          </Button>
        </div>
      </Modal>
    </div>
  )
}
