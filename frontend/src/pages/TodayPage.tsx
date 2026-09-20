import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Sun,
  Sparkles,
  ExternalLink,
  Rss,
  RefreshCw,
  Coffee,
  CheckCircle2,
  TrendingUp,
  Newspaper,
  Github,
  Calendar,
  Banknote,
  Layers,
  Clock,
  Mail,
  Zap,
} from 'lucide-react'
import { useToastStore } from '../store/useToastStore'
import { useAuthStore } from '../store/useAuthStore'
import { digestApi } from '../api/digest'
import { ingestorApi } from '../api/ingestor'
import { DigestSection } from '../features/digest/DigestSection'
import { cn } from '../utils/cn'
import type { Digest, RawItem, RawItemType } from '../api/types'

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

type PipelineCategory = 'all' | 'news' | 'email' | 'pr' | 'bill' | 'event' | 'other'

export const TodayPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { addToast } = useToastStore()

  const [viewMode, setViewMode] = useState<'digest' | 'raw'>('digest')
  const [pipelineCategory, setPipelineCategory] = useState<PipelineCategory>('all')

  // Fetch today's digest
  const {
    data: digest,
    isLoading: isDigestLoading,
    isFetching: isDigestFetching,
    refetch: refetchDigest,
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

  // Generate now mutation (supports ?deliver=1)
  const generateMutation = useMutation({
    mutationFn: (deliver: boolean = false) => digestApi.generateNow(deliver),
    onSuccess: (newDigest, variables) => {
      queryClient.setQueryData(['todayDigest'], newDigest)
      queryClient.invalidateQueries({ queryKey: ['todayDigest'] })
      queryClient.invalidateQueries({ queryKey: ['digestArchive'] })

      if (variables === true) {
        addToast({
          type: 'success',
          title: 'Briefing Dispatched',
          description: `Dispatched ${newDigest.item_count} synthesized items to your email.`,
        })
      } else {
        addToast({
          type: 'success',
          title: 'Briefing Synthesized',
          description: `Compiled ${newDigest.item_count} items across ${
            Object.keys(newDigest.sections || {}).length
          } sections.`,
        })
      }
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Operation Failed',
        description: err.response?.data?.message || 'Could not compile daily digest.',
      })
    },
  })

  // Safely normalize rawItems to prevent D.filter is not a function errors
  const safeRawItems: RawItem[] = useMemo(() => {
    if (Array.isArray(rawItems)) return rawItems
    if (Array.isArray((rawItems as any)?.results)) return (rawItems as any).results
    return []
  }, [rawItems])

  // Pipeline category counts & tabs
  const categoryCounts = useMemo(() => {
    return {
      all: safeRawItems.length,
      news: safeRawItems.filter((i) => i.type === 'news').length,
      email: safeRawItems.filter((i) => i.type === 'email').length,
      pr: safeRawItems.filter((i) => i.type === 'pr').length,
      bill: safeRawItems.filter((i) => i.type === 'bill').length,
      event: safeRawItems.filter((i) => i.type === 'event').length,
      other: safeRawItems.filter(
        (i) => !['news', 'email', 'pr', 'bill', 'event'].includes(i.type)
      ).length,
    }
  }, [safeRawItems])

  const pipelineTabs = useMemo(() => {
    const tabs: { id: PipelineCategory; label: string; count: number; icon: React.ReactNode }[] = [
      { id: 'all', label: 'All Raw Items', count: categoryCounts.all, icon: <Layers className="w-3.5 h-3.5" /> },
      { id: 'news', label: 'News & RSS', count: categoryCounts.news, icon: <Newspaper className="w-3.5 h-3.5" /> },
      { id: 'email', label: 'Emails', count: categoryCounts.email, icon: <Mail className="w-3.5 h-3.5" /> },
      { id: 'pr', label: 'GitHub / PRs', count: categoryCounts.pr, icon: <Github className="w-3.5 h-3.5" /> },
    ]

    if (categoryCounts.bill > 0) {
      tabs.push({ id: 'bill', label: 'Bills', count: categoryCounts.bill, icon: <Banknote className="w-3.5 h-3.5" /> })
    }
    if (categoryCounts.event > 0) {
      tabs.push({ id: 'event', label: 'Events', count: categoryCounts.event, icon: <Calendar className="w-3.5 h-3.5" /> })
    }
    if (categoryCounts.other > 0) {
      tabs.push({ id: 'other', label: 'Other', count: categoryCounts.other, icon: <Layers className="w-3.5 h-3.5" /> })
    }

    return tabs
  }, [categoryCounts])

  const filteredRawItems = useMemo(() => {
    if (pipelineCategory === 'all') return safeRawItems
    if (pipelineCategory === 'other') {
      return safeRawItems.filter(
        (i) => !['news', 'email', 'pr', 'bill', 'event'].includes(i.type)
      )
    }
    return safeRawItems.filter((i) => i.type === pipelineCategory)
  }, [safeRawItems, pipelineCategory])

  const todayFormatted = format(new Date(), 'EEEE, d MMMM')
  const firstName = user?.first_name || user?.name?.split(' ')[0] || (user?.email ? user.email.split('@')[0] : 'Member')
  const hasItems = digest && digest.items && Array.isArray(digest.items) && digest.items.length > 0
  const sectionsList = digest?.sections ? Object.values(digest.sections) : []
  const isDelivered = digest?.status === 'delivered' || !!digest?.delivered_at

  const getProviderIcon = (provider?: string, type?: RawItemType) => {
    const p = (provider || '').toLowerCase()
    if (p.includes('github') || type === 'pr') return <Github className="w-3.5 h-3.5 text-zinc-700" strokeWidth={1.75} />
    if (p.includes('gmail') || p.includes('mail') || type === 'email')
      return <Mail className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.75} />
    if (p.includes('rss') || type === 'news')
      return <Rss className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.75} />
    if (type === 'bill') return <Banknote className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
    if (type === 'event') return <Calendar className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.75} />
    return <Layers className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
  }

  return (
    <div className="space-y-8 pb-16">
      {/* ========================================================= */}
      {/* TOP HERO ROW: 2-Column Grid (Greeting + Mini Stats Bento) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Greeting, Date, Delivered Badge */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[34px] sm:text-[40px] text-zinc-900 tracking-tight leading-[1.1] flex items-center">
              <span>Good morning, {firstName}</span>
              <Sun className="w-7 h-7 text-amber-500 ml-3 inline-block shrink-0 animate-pulse" strokeWidth={1.75} />
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-[13.5px] text-zinc-500 tabular-nums">
            <span>{todayFormatted}</span>
            <span>&bull;</span>
            <span>{user?.profile?.timezone || 'Asia/Kolkata'}</span>
            <span>&bull;</span>
            <span>Executive Briefing Edition</span>
          </div>

          {/* Delivered Badge */}
          {isDelivered && (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
              <span>
                Delivered {digest?.delivered_at ? format(new Date(digest.delivered_at), 'h:mm a') : 'today'}
              </span>
              <span className="text-emerald-300">&bull;</span>
              <Link
                to="/archive"
                className="text-emerald-800 hover:underline lowercase font-semibold inline-flex items-center gap-0.5"
              >
                <span>archive</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Right Col: AI Cost + Stats Mini Bento (2x1) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3">
          <div className="rounded-[16px] bg-white border border-zinc-200/80 shadow-xs p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Synthesized</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="font-display font-bold text-[22px] text-zinc-900 tabular-nums leading-none">
              {digest?.item_count || 0}
            </p>
            <span className="text-[10.5px] text-zinc-500 mt-1">across {sectionsList.length} sections</span>
          </div>

          <div className="rounded-[16px] bg-white border border-zinc-200/80 shadow-xs p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">AI Cost</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="font-display font-bold text-[22px] text-zinc-900 tabular-nums leading-none">
              {digest?.llm_cost_cents ? `${digest.llm_cost_cents}¢` : '0¢'}
            </p>
            <span className="text-[10.5px] text-zinc-500 mt-1">executive synthesis</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW TABS: Pill Segmented Control in Dark Container       */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between border-b border-zinc-200/70 pb-4">
        <div className="rounded-full bg-zinc-900 p-1 inline-flex gap-1 shadow-sm">
          <button
            onClick={() => setViewMode('digest')}
            className={cn(
              'rounded-full px-5 h-9 text-[13px] font-semibold transition-all duration-200 select-none inline-flex items-center',
              viewMode === 'digest'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <span>Morning Digest</span>
            {digest?.item_count !== undefined && digest.item_count > 0 && (
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                  viewMode === 'digest' ? 'bg-zinc-900 text-white' : 'bg-white/10 text-white'
                )}
              >
                {digest.item_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('raw')}
            className={cn(
              'rounded-full px-5 h-9 text-[13px] font-semibold transition-all duration-200 select-none inline-flex items-center',
              viewMode === 'raw'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <span>Live Raw Feed Pipeline</span>
            {safeRawItems.length > 0 && (
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                  viewMode === 'raw' ? 'bg-zinc-900 text-white' : 'bg-white/10 text-white'
                )}
              >
                {safeRawItems.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => (viewMode === 'digest' ? refetchDigest() : refetchRaw())}
          disabled={isDigestFetching || isRawFetching}
          className="w-9 h-9 rounded-full bg-white border border-zinc-200/80 shadow-xs hover:bg-zinc-50 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-all active:scale-95"
          title="Refresh view"
          aria-label="Refresh view"
        >
          <RefreshCw
            className={cn('w-3.5 h-3.5', (isDigestFetching || isRawFetching) && 'animate-spin')}
          />
        </button>
      </div>

      {/* ========================================================= */}
      {/* VIEW MODE 1: MORNING DIGEST (BENTO GRID EDITORIAL)        */}
      {/* ========================================================= */}
      {viewMode === 'digest' ? (
        <div className="space-y-8">
          {isDigestLoading || generateMutation.isPending ? (
            /* Shimmer Skeleton Bento */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2 rounded-[24px] border border-zinc-200/80 bg-white p-8 space-y-4 shadow-xs">
                <div className="w-1/3 h-5 rounded-lg shimmer-skeleton" />
                <div className="w-3/4 h-7 rounded-lg shimmer-skeleton" />
                <div className="w-full h-12 rounded-lg shimmer-skeleton" />
              </div>
              <div className="col-span-1 rounded-[20px] border border-zinc-200/80 bg-white p-6 space-y-3 shadow-xs">
                <div className="w-1/2 h-4 rounded-lg shimmer-skeleton" />
                <div className="w-full h-8 rounded-lg shimmer-skeleton" />
              </div>
              <div className="col-span-1 rounded-[20px] border border-zinc-200/80 bg-white p-6 space-y-3 shadow-xs">
                <div className="w-1/2 h-4 rounded-lg shimmer-skeleton" />
                <div className="w-full h-8 rounded-lg shimmer-skeleton" />
              </div>
            </div>
          ) : !hasItems ? (
            /* Empty State */
            <div className="rounded-[24px] border-2 border-dashed border-zinc-200 bg-white/70 p-10 sm:p-14 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-[20px] bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4 shadow-xs">
                <Coffee className="w-7 h-7 text-zinc-500" strokeWidth={1.75} />
              </div>
              <h3 className="font-display font-bold text-[20px] text-zinc-900">
                Your briefing is ready to compile
              </h3>
              <p className="text-[14px] text-zinc-500 mt-1 max-w-sm mb-6 leading-relaxed">
                Raw items from Hacker News, GitHub, and your connected feeds are normalized and waiting for executive synthesis.
              </p>
              <button
                onClick={() => generateMutation.mutate(false)}
                disabled={generateMutation.isPending}
                className="h-10 px-6 rounded-full bg-zinc-900 text-white shadow-lg hover:bg-black hover:shadow-xl hover:-translate-y-px active:scale-[0.98] text-[14px] font-semibold transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" strokeWidth={1.75} />
                <span>Synthesize Today’s Briefing</span>
              </button>
            </div>
          ) : (
            /* Sections with Bento Cards */
            <div className="space-y-8">
              {sectionsList.map((sectionGroup) => (
                <DigestSection
                  key={sectionGroup.key}
                  sectionKey={sectionGroup.key}
                  title={sectionGroup.title}
                  items={sectionGroup.items}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* VIEW MODE 2: LIVE RAW FEED PIPELINE WITH CLASSIFIED TABS */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Classified Toggles (All, News, Emails, GitHub/PRs, Bills, Events) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {pipelineTabs.map((tab) => {
              const isSelected = pipelineCategory === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setPipelineCategory(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 select-none whitespace-nowrap active:scale-95 shadow-xs',
                    isSelected
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200/80 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                      isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Pipeline Bento Cards */}
          {isRawLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-[20px] border border-zinc-200/80 bg-white p-5 space-y-3 shadow-xs"
                >
                  <div className="w-1/2 h-4 rounded-lg shimmer-skeleton" />
                  <div className="w-full h-12 rounded-lg shimmer-skeleton" />
                </div>
              ))}
            </div>
          ) : filteredRawItems.length === 0 ? (
            <div className="rounded-[24px] border-2 border-dashed border-zinc-200 bg-white/70 p-10 text-center flex flex-col items-center justify-center">
              <Rss className="w-8 h-8 text-zinc-400 mb-2" />
              <h4 className="font-semibold text-zinc-900 text-base">No items in this category</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mb-4">
                No raw items have been ingested for this specific classification yet.
              </p>
              <button
                onClick={() => setPipelineCategory('all')}
                className="h-8 px-4 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold"
              >
                View All Items
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRawItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:-translate-y-[2px] transition-all duration-300 ease-out flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-zinc-900 rounded-t-[20px]" />

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="rounded-full bg-zinc-900 text-white px-2.5 py-0.5 text-[11px] font-semibold inline-flex items-center gap-1.5 select-none shadow-xs truncate">
                        {getProviderIcon(item.connection_provider, item.type)}
                        <span className="truncate">{item.connection_name || 'Feed Source'}</span>
                      </span>

                      <span className="text-[11px] text-zinc-400 tabular-nums shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>{formatRelativeTime(item.received_at)}</span>
                      </span>
                    </div>

                    {/* Content */}
                    <div className="space-y-1.5">
                      <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      {item.body_snippet && (
                        <p className="text-[13px] text-zinc-600 line-clamp-3 leading-relaxed">
                          {item.body_snippet}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <span className="rounded-full bg-zinc-100 border border-zinc-200/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      {item.type_display || item.type}
                    </span>

                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 hover:text-black transition-colors"
                      >
                        <span>Open Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">No URL</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
