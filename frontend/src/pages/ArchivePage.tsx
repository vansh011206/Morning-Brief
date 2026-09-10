import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Archive,
  Calendar,
  Search,
  ChevronRight,
  ExternalLink,
  ChevronLeft,
  Clock,
} from 'lucide-react'
import {
  Input,
  Card,
  Badge,
  Skeleton,
  Modal,
  Button,
  EmptyState,
} from '../components/ui'
import { digestApi } from '../api/digest'
import type { Digest, DigestItem, DigestSectionKey } from '../api/types'

const SECTION_BORDER_COLORS: Record<DigestSectionKey, string> = {
  news: 'border-l-indigo-600',
  actions: 'border-l-amber-500',
  emails: 'border-l-sky-500',
  money: 'border-l-emerald-500',
  events: 'border-l-purple-500',
}

const SECTION_BADGE_VARIANTS: Record<DigestSectionKey, 'indigo' | 'amber' | 'emerald' | 'rose' | 'zinc'> = {
  news: 'indigo',
  actions: 'amber',
  emails: 'indigo',
  money: 'emerald',
  events: 'zinc',
}


function formatDateSafe(dateStr: string, formatPattern: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return format(d, formatPattern)
  } catch {
    return dateStr
  }
}

export const ArchivePage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedDigest, setSelectedDigest] = useState<Digest | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Fetch paginated digests
  const {
    data: paginatedData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['digestArchive', currentPage],
    queryFn: () => digestApi.getDigests(currentPage),
  })

  const digests = paginatedData?.results || []
  const totalCount = paginatedData?.count || 0
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Local filter for search query
  const filteredDigests = digests.filter((d) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const matchesDate = d.digest_date.toLowerCase().includes(q)
    const matchesItems = d.items?.some(
      (item) =>
        item.source_title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
    )
    return matchesDate || matchesItems
  })

  const handleOpenDetail = (digest: Digest) => {
    setSelectedDigest(digest)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 px-2 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900 tracking-tight">
              Digest Archive
            </h1>
            <Badge variant="indigo" size="sm">
              Historical Records
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Access past executive morning summaries, inspect delivered email briefs, and review historical briefings.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 bg-zinc-100/80 px-3 py-1.5 rounded-lg border border-zinc-200">
          <Archive className="w-3.5 h-3.5 text-zinc-500" />
          <span>{totalCount} Total Briefings</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search past briefings by keywords, topics, headlines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="bg-white"
        />
      </div>

      {/* Digest List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-5 bg-white rounded-xl border border-zinc-200/80 flex items-center justify-between animate-pulse"
              >
                <div className="space-y-2 w-2/3">
                  <Skeleton className="w-40 h-4" />
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-28 h-3" />
                </div>
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredDigests.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8 text-zinc-400" />}
            title={searchQuery ? 'No matching briefings' : 'No past briefings found'}
            description={
              searchQuery
                ? `No digests matched "${searchQuery}". Try different keywords.`
                : 'Your daily briefs will accumulate here every morning as they are generated and delivered.'
            }
          />
        ) : (
          filteredDigests.map((digest) => {
            const formattedDate = formatDateSafe(digest.digest_date, 'EEEE, d MMM yyyy')
            const isDelivered = digest.status === 'delivered' || !!digest.delivered_at
            const deliveryTime = digest.delivered_at
              ? formatDateSafe(digest.delivered_at, 'h:mm a')
              : null

            // Preview headline from first item
            const firstItem = digest.items && digest.items.length > 0 ? digest.items[0] : null
            const headline = firstItem
              ? firstItem.source_title
              : `${digest.item_count} items synthesized across news and communications`

            return (
              <Card
                key={digest.id}
                hoverable
                onClick={() => handleOpenDetail(digest)}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0 border border-zinc-200">
                    <Calendar className="w-5 h-5 text-zinc-600" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900">
                        {formattedDate}
                      </span>

                      {isDelivered ? (
                        <Badge variant="emerald" dot size="sm">
                          Delivered {deliveryTime ? `at ${deliveryTime}` : ''}
                        </Badge>
                      ) : digest.status === 'ready' ? (
                        <Badge variant="indigo" dot size="sm">
                          Ready in App
                        </Badge>
                      ) : (
                        <Badge variant="amber" dot size="sm">
                          {digest.status_display || 'Processing'}
                        </Badge>
                      )}

                      {digest.important_count > 0 && (
                        <Badge variant="rose" size="sm">
                          {digest.important_count} High Priority
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-sm font-medium text-zinc-800 truncate">
                      {headline}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                      <span>{digest.item_count} ranked items</span>
                      <span>&bull;</span>
                      <span>AI Cost: {digest.llm_cost_cents}¢</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-primary hidden sm:inline">
                    View Briefing
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-primary">
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200/80">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1 || isFetching}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>

          <span className="text-xs font-mono text-zinc-500">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages || isFetching}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Next
          </Button>
        </div>
      )}

      {/* Full Digest Detail Modal Styled Like the Morning Email */}
      {selectedDigest && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          size="xl"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Modal Header Band (Simulating Email Header) */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm">
                    M
                  </div>
                  <span className="font-display font-bold text-lg tracking-tight">
                    MorningBrief
                  </span>
                </div>
                <Badge variant="indigo" size="sm" className="bg-white/20 text-white border-white/30">
                  {selectedDigest.status === 'delivered' ? 'Email Dispatched' : 'Compiled Briefing'}
                </Badge>
              </div>

              <div>
                <h2 className="text-xl font-bold font-display">
                  {formatDateSafe(selectedDigest.digest_date, 'EEEE, MMMM d, yyyy')}
                </h2>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {selectedDigest.item_count} items synthesized &bull;{' '}
                  {selectedDigest.important_count} high priority &bull; AI cost: {selectedDigest.llm_cost_cents}¢
                </p>
              </div>
            </div>

            {/* Delivery Metadata Strip */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs">
              <div className="flex items-center gap-2 text-zinc-600">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {selectedDigest.delivered_at
                    ? `Delivered on ${formatDateSafe(selectedDigest.delivered_at, 'MMM d, yyyy · h:mm a')}`
                    : 'Compiled and stored in archive'}
                </span>
              </div>
              <Badge variant={selectedDigest.status === 'delivered' ? 'emerald' : 'indigo'} size="sm">
                {selectedDigest.status_display || selectedDigest.status}
              </Badge>
            </div>

            {/* Digest Sections and Items */}
            <div className="space-y-6">
              {selectedDigest.sections && Object.keys(selectedDigest.sections).length > 0 ? (
                Object.values(selectedDigest.sections).map((sectionGroup) => {
                  const borderClass =
                    SECTION_BORDER_COLORS[sectionGroup.key as DigestSectionKey] || 'border-l-indigo-500'
                  const badgeVariant =
                    SECTION_BADGE_VARIANTS[sectionGroup.key as DigestSectionKey] || 'default'

                  return (
                    <div key={sectionGroup.key} className="space-y-3">
                      {/* Section Title */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                            {sectionGroup.title}
                          </span>
                        </div>
                        <Badge variant={badgeVariant} size="sm">
                          {sectionGroup.count}
                        </Badge>
                      </div>

                      {/* Items */}
                      <div className="space-y-2.5">
                        {sectionGroup.items.map((item: DigestItem) => (
                          <div
                            key={item.id}
                            className={`p-4 rounded-xl bg-zinc-50 border border-zinc-200/90 border-l-4 ${borderClass} space-y-2`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-zinc-600 bg-white px-2 py-0.5 rounded border border-zinc-200">
                                  {item.source_name || 'Feed Source'}
                                </span>
                                {item.author && (
                                  <span className="text-[11px] text-zinc-400">
                                    by {item.author}
                                  </span>
                                )}
                              </div>

                              {item.priority === 'urgent' && (
                                <Badge variant="rose" size="sm">
                                  Urgent
                                </Badge>
                              )}
                              {item.priority === 'high' && (
                                <Badge variant="amber" size="sm">
                                  High
                                </Badge>
                              )}
                            </div>

                            <h4 className="text-sm font-semibold text-zinc-900 leading-snug">
                              {item.source_title}
                            </h4>

                            <p className="text-xs text-zinc-600 leading-relaxed">
                              {item.summary}
                            </p>

                            {item.source_url && (
                              <div className="pt-1">
                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
                                >
                                  <span>Read source article</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-6 text-center text-zinc-500 text-sm bg-zinc-50 rounded-xl border border-zinc-200">
                  No individual items recorded for this briefing date.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-4 border-t border-zinc-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Close Briefing
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
