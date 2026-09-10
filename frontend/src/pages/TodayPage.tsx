import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Sparkles,
  ExternalLink,
  Rss,
  RefreshCw,
  Coffee,
  TrendingUp,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  SegmentedTabs,
  SkeletonFeedCard,
  EmptyState,
} from '../components/ui'
import { useToastStore } from '../store/useToastStore'
import { useAuthStore } from '../store/useAuthStore'
import { digestApi } from '../api/digest'
import { ingestorApi } from '../api/ingestor'
import { DigestSection } from '../features/digest/DigestSection'
import type { Digest, RawItem } from '../api/types'

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'Recently'
  }
}

export const TodayPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { addToast } = useToastStore()

  const [viewMode, setViewMode] = useState<'digest' | 'raw'>('digest')

  // Fetch today's digest
  const {
    data: digest,
    isLoading: isDigestLoading,
    isFetching: isDigestFetching,
  } = useQuery<Digest>({
    queryKey: ['todayDigest'],
    queryFn: digestApi.getTodayDigest,
    retry: false,
  })

  // Fetch live raw items for pipeline inspection
  const {
    data: rawItems = [],
    isLoading: isRawLoading,
    refetch: refetchRaw,
    isFetching: isRawFetching,
  } = useQuery<RawItem[]>({
    queryKey: ['rawItems'],
    queryFn: () => ingestorApi.getRawItems({ limit: 50 }),
  })

  // Generate now mutation
  const generateMutation = useMutation({
    mutationFn: digestApi.generateNow,
    onSuccess: (newDigest) => {
      queryClient.setQueryData(['todayDigest'], newDigest)
      queryClient.invalidateQueries({ queryKey: ['todayDigest'] })
      addToast({
        type: 'success',
        title: 'Digest Compiled',
        description: `Synthesized ${newDigest.item_count} items across ${
          Object.keys(newDigest.sections || {}).length
        } sections.`,
      })
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Generation Failed',
        description: err.response?.data?.message || 'Could not compile daily digest.',
      })
    },
  })

  const mainViewTabs = [
    { id: 'digest', label: 'Morning Digest' },
    {
      id: 'raw',
      label: 'Live Raw Feed Pipeline',
      badge: rawItems.length > 0 ? rawItems.length : undefined,
    },
  ]

  // Date Header & Greeting
  const todayFormatted = format(new Date(), 'EEEE, d MMM')
  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there'

  const hasItems = digest && digest.items && digest.items.length > 0
  const sectionsList = digest?.sections ? Object.values(digest.sections) : []

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-14 px-2 sm:px-0">
      {/* Page Header with Greeting & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary font-mono">
              {todayFormatted}
            </span>
            <Badge variant="indigo" size="sm">
              Daily Synthesis
            </Badge>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1">
            Good morning, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Here is your curated executive brief distilled from connected channels and news feeds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {viewMode === 'raw' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchRaw()}
              isLoading={isRawFetching}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Raw Feed
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              isLoading={generateMutation.isPending || isDigestFetching}
              onClick={() => generateMutation.mutate()}
              leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
            >
              {hasItems ? 'Re-rank Briefing' : 'Generate Briefing'}
            </Button>
          )}
        </div>
      </div>

      {/* Top View Selector: Morning Digest vs. Live Raw Pipeline */}
      <div>
        <SegmentedTabs
          tabs={mainViewTabs}
          activeTab={viewMode}
          onChange={(tab) => setViewMode(tab as 'digest' | 'raw')}
        />
      </div>

      {/* VIEW MODE 1: Morning Digest */}
      {viewMode === 'digest' ? (
        <div className="space-y-8">
          {isDigestLoading || generateMutation.isPending ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 animate-pulse flex items-center justify-between">
                <div className="h-4 bg-zinc-200 rounded w-1/3"></div>
                <div className="h-4 bg-zinc-200 rounded w-20"></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <SkeletonFeedCard />
                <SkeletonFeedCard />
                <SkeletonFeedCard />
              </div>
            </div>
          ) : !hasItems ? (
            /* Empty State: Brief is being brewed */
            <EmptyState
              icon={<Coffee className="w-8 h-8 text-amber-500" />}
              title="Your first brief is being brewed"
              description="No briefing compiled for today yet. Ingested news and communications are queued and ready for executive synthesis."
              action={
                <Button
                  variant="primary"
                  onClick={() => generateMutation.mutate()}
                  isLoading={generateMutation.isPending}
                  leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
                >
                  Generate Today's Digest
                </Button>
              }
            />
          ) : (
            /* Ready Digest with Sections & Items */
            <div className="space-y-8">
              {/* Digest Metadata Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-50/90 border border-zinc-200/80 text-xs">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge variant="emerald" dot size="sm">
                    Ready · {digest.item_count} items
                  </Badge>

                  {digest.important_count > 0 && (
                    <Badge variant="rose" size="sm">
                      {digest.important_count} High Priority
                    </Badge>
                  )}

                  <span className="text-zinc-300 hidden sm:inline">•</span>
                  <span className="text-zinc-500 font-mono text-[11px]">
                    Generated {formatRelativeTime(digest.updated_at || digest.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                  <span>AI Cost: {digest.llm_cost_cents}¢</span>
                </div>
              </div>

              {/* Sections rendering */}
              <div className="space-y-10">
                {sectionsList.map((sectionGroup) => (
                  <DigestSection
                    key={sectionGroup.key}
                    sectionKey={sectionGroup.key}
                    title={sectionGroup.title}
                    items={sectionGroup.items}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: Real Raw Ingested Feed Pipeline */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rss className="w-4 h-4 text-amber-600" />
              <h2 className="font-display font-semibold text-lg text-zinc-900">
                Recent Ingested Raw Items
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              Normalized &amp; Deduplicated
            </span>
          </div>

          {isRawLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonFeedCard />
              <SkeletonFeedCard />
              <SkeletonFeedCard />
              <SkeletonFeedCard />
            </div>
          ) : rawItems.length === 0 ? (
            <EmptyState
              icon={<Rss className="w-6 h-6" />}
              title="No Ingested Items Found"
              description="Your feeds have not fetched items yet. Ensure your RSS feeds are active and trigger a sync from the Channels page."
              action={
                <Button
                  variant="primary"
                  onClick={() => refetchRaw()}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  Poll Feed Ingestor
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rawItems.map((item) => (
                <Card
                  key={item.id}
                  hoverable
                  className="flex flex-col justify-between transition-all hover:border-zinc-300"
                >
                  <div>
                    <CardHeader className="py-3.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="amber" size="sm">
                          {item.connection_name || 'RSS Feed'}
                        </Badge>
                        <span className="text-zinc-300">•</span>
                        <span className="text-xs text-zinc-400 truncate">
                          {item.author || 'Feed Source'}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono shrink-0">
                        {formatRelativeTime(item.received_at)}
                      </span>
                    </CardHeader>

                    <CardContent className="py-2 space-y-2">
                      <CardTitle className="text-sm font-semibold text-zinc-900 leading-snug line-clamp-2">
                        {item.title}
                      </CardTitle>
                      {item.body_snippet && (
                        <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                          {item.body_snippet}
                        </p>
                      )}
                    </CardContent>
                  </div>

                  <CardFooter className="py-2.5 px-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <Badge variant="outline" size="sm">
                      {item.type_display || 'News'}
                    </Badge>

                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-hover transition-colors"
                      >
                        <span>Read Article</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">No URL</span>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
