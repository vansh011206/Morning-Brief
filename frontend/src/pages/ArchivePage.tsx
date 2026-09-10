import React, { useState } from 'react'
import {
  Archive,
  Calendar,
  Search,
  ChevronRight,
  Filter,
} from 'lucide-react'
import {
  Input,
  Card,
  Badge,
  Skeleton,
} from '../components/ui'

export const ArchivePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')

  const archiveDays = [
    {
      date: 'Yesterday • Sep 8',
      headline: 'Quarterly OKR alignment & 4 recruiter inquiries',
      totalItems: 9,
      urgent: 2,
    },
    {
      date: 'Sep 7',
      headline: 'Deployment notification for auth service & Dependabot PRs',
      totalItems: 14,
      urgent: 1,
    },
    {
      date: 'Sep 6',
      headline: 'Weekend digest: 6 newsletter summaries & system uptime logs',
      totalItems: 6,
      urgent: 0,
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900 tracking-tight">
            Digest Archive
          </h1>
          <Badge variant="indigo" size="md">
            Coming Soon
          </Badge>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Access historical AI briefings, search past summaries, and review resolved action items.
        </p>
      </div>

      {/* Search Bar & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search past briefings, senders, keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="bg-white"
        />
        <button className="h-10 px-4 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-50 shrink-0">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <span>Date Range</span>
        </button>
      </div>

      {/* Past Digest Cards */}
      <div className="space-y-3">
        {archiveDays.map((day, idx) => (
          <Card key={idx} hoverable className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-500">{day.date}</span>
                  {day.urgent > 0 && (
                    <Badge variant="rose" size="sm">
                      {day.urgent} Urgent
                    </Badge>
                  )}
                </div>
                <h4 className="text-sm font-medium text-zinc-900 truncate mt-0.5">
                  {day.headline}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {day.totalItems} ranked items processed
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
          </Card>
        ))}
      </div>

      {/* Skeleton Loading State Preview */}
      <div className="pt-6 border-t border-zinc-200/80">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Loading Older Archive Pages
          </span>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-white rounded-xl border border-zinc-200/80 flex items-center justify-between">
            <div className="space-y-2 w-2/3">
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-full h-4" />
            </div>
            <Skeleton className="w-6 h-6 rounded-md" />
          </div>
          <div className="p-4 bg-white rounded-xl border border-zinc-200/80 flex items-center justify-between">
            <div className="space-y-2 w-1/2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-full h-4" />
            </div>
            <Skeleton className="w-6 h-6 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
