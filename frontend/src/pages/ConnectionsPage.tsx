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
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'Recently'
  }
}

export const ConnectionsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { addToast } = useToastStore()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [feedName, setFeedName] = useState('')
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

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
        description: `'${updated.display_name}' ${
          updated.is_active ? 'will be included' : 'paused'
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

  // Static roadmap integrations for demonstration
  const roadmapIntegrations = [
    {
      id: 'gmail',
      name: 'Google Gmail',
      icon: <Mail className="w-5 h-5 text-rose" />,
      tag: 'OAuth 2.0',
      description: 'Read-only access to email headers & snippets. Detects recruiter outreach and urgent notices.',
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: <Github className="w-5 h-5 text-zinc-800" />,
      tag: 'Personal Access / OAuth',
      description: 'Reviews assigned pull requests, repository mentions, and CI build status.',
    },
    {
      id: 'telegram',
      name: 'Telegram Messenger',
      icon: <Send className="w-5 h-5 text-sky-600" />,
      tag: 'Bot Webhook',
      description: 'Instant morning brief delivery and priority alerts sent directly to your Telegram chat.',
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      icon: <Calendar className="w-5 h-5 text-amber-600" />,
      tag: 'Calendar API',
      description: 'Synthesizes upcoming meetings, agenda items, and schedule conflicts into your morning digest.',
    },
  ]

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-12">
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
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-white space-y-4">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-white space-y-4">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ) : isError ? (
          <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50/50 text-center space-y-2">
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
                  className={`flex flex-col justify-between transition-all border ${
                    isErrorState
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

      {/* SECTION 2: OAuth Workspace Channels (Roadmap / Stubs) */}
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
          <Badge variant="zinc" size="sm">
            Roadmap (Phase 5/8)
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roadmapIntegrations.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between">
              <div>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <span className="text-xs font-mono text-zinc-400">{item.tag}</span>
                    </div>
                  </div>
                  <Badge variant="zinc" size="sm">
                    Coming Soon
                  </Badge>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                    <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item.description}</span>
                  </div>
                </CardContent>
              </div>

              <CardFooter className="py-2.5 px-5 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-400">
                <span>Phase 5/8 OAuth Release</span>
                <Button size="sm" variant="ghost" disabled>
                  Preview
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

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
