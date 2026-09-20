import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Inbox,
  Sparkles,
  CheckCircle2,
  X,
  Clock,
} from 'lucide-react'
import { Input } from '../components/ui'
import { DigestItemCard } from '../features/digest/DigestItemCard'
import { digestApi } from '../api/digest'
import type { Digest, DigestItem } from '../api/types'

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

  const digests: Digest[] = Array.isArray(paginatedData?.results)
    ? paginatedData.results
    : Array.isArray(paginatedData)
    ? paginatedData
    : []
  const totalCount = paginatedData?.count || 0
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Filter digests based on search query
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative">
      {/* Ambient Canvas Mesh Blobs */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/6 rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="absolute top-12 right-1/4 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[70px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="border-b border-zinc-200/80 pb-6 mb-6">
        <div>
          <h1 className="font-display font-bold text-[28px] text-zinc-900 tracking-tight leading-tight">
            Archive
          </h1>
          <p className="text-[14px] text-zinc-500 mt-1">
            Historical synthesized briefings archive
          </p>
        </div>

        {/* Search Input with Cmd+K hint */}
        <div className="mt-5 relative">
          <Input
            type="text"
            placeholder="Search past briefings by keywords, topics, headlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />}
            rightIcon={
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full">
                ⌘K
              </kbd>
            }
          />
        </div>
      </div>

      {/* List: Vertical Timeline with Date Groups */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-[20px] bg-white border border-zinc-200/80 p-5 sm:p-6 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-4 w-2/3">
                  <div className="w-12 h-10 rounded-lg bg-zinc-100 animate-pulse" />
                  <div className="space-y-2 w-full">
                    <div className="w-40 h-4 rounded bg-zinc-100 animate-pulse" />
                    <div className="w-24 h-3 rounded bg-zinc-100 animate-pulse" />
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-zinc-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredDigests.length === 0 ? (
          /* Empty State */
          <div className="rounded-[24px] border-dashed border-2 border-zinc-200 bg-white/50 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-[20px] bg-gradient-to-b from-zinc-50 to-white border border-zinc-200 shadow-xs flex items-center justify-center text-zinc-400 mb-4">
              <Inbox className="w-6 h-6 text-zinc-400" strokeWidth={1.75} />
            </div>
            <h3 className="font-display font-semibold text-[18px] text-zinc-900">
              {searchQuery ? 'No matching briefings' : 'No past briefings found'}
            </h3>
            <p className="text-[14px] text-zinc-500 mt-1 max-w-sm leading-normal">
              {searchQuery
                ? `No digests matched "${searchQuery}". Try different search terms.`
                : 'Your daily briefs will accumulate here every morning as they are generated and delivered.'}
            </p>
          </div>
        ) : (
          filteredDigests.map((digest) => {
            const dayNumber = formatDateSafe(digest.digest_date, 'd')
            const monthText = formatDateSafe(digest.digest_date, 'MMM yyyy')
            const isDelivered = digest.status === 'delivered' || !!digest.delivered_at

            return (
              <div
                key={digest.id}
                onClick={() => handleOpenDetail(digest)}
                className="rounded-[20px] bg-white border border-zinc-200/80 shadow-xs hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 p-5 sm:p-6 flex items-center justify-between group cursor-pointer"
              >
                {/* Left Block */}
                <div className="flex items-center min-w-0">
                  {/* Date block: Day Sora 22px 700 ink, month 12px uppercase muted */}
                  <div className="flex flex-col items-center justify-center min-w-[56px] text-center shrink-0">
                    <span className="font-display font-bold text-[22px] text-zinc-900 leading-none">
                      {dayNumber}
                    </span>
                    <span className="text-[12px] uppercase text-zinc-500 tracking-wide font-medium mt-1">
                      {monthText}
                    </span>
                  </div>

                  {/* Vertical Divider: 1px h-10 bg-zinc-200 mx-4 */}
                  <div className="w-px h-10 bg-zinc-200 mx-4 shrink-0" />

                  {/* Stats & Metadata */}
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    {/* Inbox count stat */}
                    <span className="rounded-full bg-zinc-50 border border-zinc-200/80 px-2.5 py-1 text-[11px] font-medium text-zinc-600 flex items-center gap-1.5 select-none">
                      <Inbox className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
                      <span>{digest.item_count} items</span>
                    </span>

                    {/* Sparkles important count */}
                    {digest.important_count > 0 && (
                      <span className="rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-[11px] font-medium text-amber-700 flex items-center gap-1.5 select-none">
                        <Sparkles className="w-3 h-3 text-amber-500" strokeWidth={1.75} />
                        <span>{digest.important_count} high priority</span>
                      </span>
                    )}

                    {/* Delivery Status */}
                    {isDelivered ? (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5 select-none">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2} />
                        <span>Delivered</span>
                      </span>
                    ) : digest.status === 'ready' ? (
                      <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5 select-none">
                        Ready
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Right: Chevron inside 32px rounded-xl tile */}
                <div className="w-8 h-8 rounded-xl bg-zinc-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 text-zinc-400 flex items-center justify-center shrink-0 transition-all duration-200 ml-3">
                  <ChevronRight
                    className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform duration-200"
                    strokeWidth={1.75}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination: Rounded-full pill buttons */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          <button
            type="button"
            disabled={currentPage <= 1 || isFetching}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="rounded-full h-8 px-3.5 text-[13px] font-medium border border-zinc-200 bg-white hover:bg-zinc-50 shadow-xs flex items-center gap-1.5 text-zinc-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
            <span>Previous</span>
          </button>

          <span className="text-[12px] font-mono text-zinc-400 px-3 tabular-nums">
            {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages || isFetching}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-full h-8 px-3.5 text-[13px] font-medium border border-zinc-200 bg-white hover:bg-zinc-50 shadow-xs flex items-center gap-1.5 text-zinc-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Detail Modal: Overlay bg-zinc-900/20 backdrop-blur-sm, panel bg-white rounded-[24px] shadow-lg */}
      {isModalOpen && selectedDigest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-lg max-w-3xl w-full max-h-[85vh] overflow-hidden border border-zinc-200/80 flex flex-col relative animate-in zoom-in-95 duration-200">
            {/* Sticky Modal Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-zinc-200/60 p-5 sm:p-6 flex items-center justify-between z-10 shrink-0">
              <div>
                <h2 className="font-display font-semibold text-[18px] text-zinc-900 tracking-tight">
                  Morning Brief • {formatDateSafe(selectedDigest.digest_date, 'EEEE, d MMM yyyy')}
                </h2>
                <div className="flex items-center gap-2 text-[12px] text-zinc-500 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                  <span>
                    {selectedDigest.delivered_at
                      ? `Delivered at ${formatDateSafe(selectedDigest.delivered_at, 'h:mm a')}`
                      : 'Saved in archive'}
                  </span>
                  <span>•</span>
                  <span>{selectedDigest.item_count} items</span>
                </div>
              </div>

              {/* Close Button: 36px rounded-xl hover:bg-zinc-100 */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Modal Body: overflow-y-auto with DigestItemCard styling */}
            <div className="p-5 sm:p-6 overflow-y-auto divide-y divide-zinc-100">
              {selectedDigest.items && selectedDigest.items.length > 0 ? (
                selectedDigest.items.map((item: DigestItem) => (
                  <DigestItemCard key={item.id} item={item} />
                ))
              ) : (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No items recorded for this briefing date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
