import React, { useState, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Inbox,
  Archive,
  Link2,
  Settings,
  LogOut,
  ExternalLink,
  Sparkles,
  Mail,
  RefreshCw,
  CheckCircle2,
  Menu,
  X,
  SlidersHorizontal,
  Search,
  Github,
  Rss,
  TrendingUp,
} from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { ToastContainer } from '../components/ui/Toast'
import { CommandPalette } from '../components/CommandPalette'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import { authApi } from '../api/auth'
import { digestApi } from '../api/digest'
import { ingestorApi } from '../api/ingestor'
import { connectionsApi } from '../api/connections'
import { cn } from '../utils/cn'
import type { Digest, RawItem, Connection } from '../api/types'

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

export const AppShell: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { addToast } = useToastStore()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Fetch today's digest for right panel stats & sidebar cost
  const { data: digest, isFetching: isDigestFetching, refetch: refetchDigest } = useQuery<Digest>({
    queryKey: ['todayDigest'],
    queryFn: digestApi.getTodayDigest,
    retry: false,
  })

  // Fetch live raw items for right panel live pipeline
  const { data: rawItems = [], isFetching: isRawFetching, refetch: refetchRaw } = useQuery<RawItem[]>({
    queryKey: ['rawItems'],
    queryFn: () => ingestorApi.getRawItems({ limit: 20 }),
  })

  // Fetch connections for sidebar source indicators
  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: connectionsApi.getConnections,
  })

  // Global generate / re-rank mutation
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

  const handleLogout = async () => {
    const refresh = useAuthStore.getState().refreshToken
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        // Ignore network errors on logout
      }
    }
    logout()
    navigate('/login')
  }

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Calculate countdown time for right panel
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number }>({ hours: 0, minutes: 0 })
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const targetTime = user?.profile?.digest_time || '07:00'
      const now = new Date()
      const [targetHours, targetMinutes] = targetTime.split(':').map(Number)
      const target = new Date(now)
      target.setHours(targetHours || 7, targetMinutes || 0, 0, 0)
      if (now.getTime() >= target.getTime()) {
        target.setDate(target.getDate() + 1)
      }
      const diffMs = target.getTime() - now.getTime()
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
      setTimeLeft({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
      })
    }
    calculateTimeRemaining()
    const timer = setInterval(calculateTimeRemaining, 10000)
    return () => clearInterval(timer)
  }, [user?.profile?.digest_time])

  const safeConnections: Connection[] = useMemo(() => {
    if (Array.isArray(connections)) return connections
    if (Array.isArray((connections as any)?.results)) return (connections as any).results
    return []
  }, [connections])

  const navItems = [
    { to: '/today', label: 'Today', icon: <Inbox className="w-[18px] h-[18px]" strokeWidth={1.75} />, count: digest?.item_count },
    { to: '/archive', label: 'Archive', icon: <Archive className="w-[18px] h-[18px]" strokeWidth={1.75} /> },
    { to: '/connections', label: 'Connections', icon: <Link2 className="w-[18px] h-[18px]" strokeWidth={1.75} />, count: safeConnections.filter(c => c.is_active).length },
    { to: '/settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" strokeWidth={1.75} /> },
  ]

  const firstName = user?.first_name || user?.name?.split(' ')[0] || (user?.email ? user.email.split('@')[0] : 'Member')
  const isDelivered = digest?.status === 'delivered' || !!digest?.delivered_at
  const hasItems = digest && digest.items && Array.isArray(digest.items) && digest.items.length > 0

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F7F4] text-zinc-900 selection:bg-zinc-900 selection:text-white relative">
      {/* Ambient Canvas Mesh Blobs */}
      <div className="mesh-blob-indigo" aria-hidden="true" />
      <div className="mesh-blob-amber" aria-hidden="true" />

      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR (260px-280px, Dark #0F0F0F, Linear/Notion style) */}
      {/* ========================================================= */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[260px] 2xl:w-[280px] h-screen bg-[#0F0F0F] text-white border-r border-zinc-800 flex flex-col justify-between p-4 transition-transform duration-300 select-none lg:static lg:translate-x-0 shrink-0 shadow-2xl lg:shadow-none',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Top: Logo + Wordmark */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between h-14 px-2">
            <NavLink to="/" className="flex items-center gap-3 group outline-none">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/15 shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <img src="/logo.png" alt="MorningBrief Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-[16px] tracking-tight text-white leading-none">
                  MorningBrief
                </span>
                <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 mt-1">
                  Executive Intelligence
                </span>
              </div>
            </NavLink>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 mt-6" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 outline-none',
                    isActive
                      ? 'bg-white/10 text-white font-semibold shadow-xs border border-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums',
                        isActive ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-300'
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Active Sources Section */}
          <div className="mt-8 border-t border-zinc-800/80 pt-5 px-1">
            <div className="flex items-center justify-between px-2 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Connected Sources
              </span>
              <NavLink
                to="/connections"
                className="text-[10px] text-zinc-400 hover:text-white transition-colors uppercase font-semibold"
              >
                Manage
              </NavLink>
            </div>

            <div className="space-y-1.5 text-[12.5px]">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <Rss className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Hacker News RSS</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-zinc-500 tabular-nums">50 items</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <Github className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  <span className="truncate">GitHub Pull Requests</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-zinc-500">Synced</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">Gmail Inbox</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-zinc-500">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Area: AI Cost Card & User Profile */}
        <div className="space-y-3 pt-4 border-t border-zinc-800/80">
          {/* AI Cost Mini Card */}
          <div className="rounded-[16px] bg-white/5 border border-white/10 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-zinc-300">Daily Synthesis</p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {digest?.llm_cost_cents ? `${digest.llm_cost_cents}¢ AI cost` : 'Ready to brew'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              v2.0
            </span>
          </div>

          {/* User Profile Bar */}
          <div className="flex items-center justify-between px-2 pt-1">
            <NavLink to="/settings" className="flex items-center gap-2.5 min-w-0 outline-none group">
              <Avatar
                name={user?.first_name || user?.username || user?.email}
                size="sm"
                online={true}
              />
              <div className="truncate">
                <p className="text-[13px] font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                  {firstName}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {user?.profile?.timezone || 'Asia/Kolkata'}
                </p>
              </div>
            </NavLink>

            <button
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-zinc-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* 2. CENTER MAIN CANVAS (flex-1, Warm Paper #FCFCF9, Bento) */}
      {/* ========================================================= */}
      <div className="flex-1 h-screen overflow-y-auto bg-[#FCFCF9] relative flex flex-col min-w-0">
        {/* Center Header (responsive height & padding) */}
        <header className="h-[60px] sm:h-[72px] shrink-0 border-b border-zinc-200/70 flex items-center justify-between px-3 sm:px-6 lg:px-10 bg-[#FCFCF9]/90 backdrop-blur-md sticky top-0 z-20">
          {/* Left: Mobile hamburger + Wordmark / Greeting */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="font-display font-bold text-[16px] sm:text-[24px] text-zinc-900 tracking-tight leading-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                Executive Command Center
              </h2>
              <p className="text-[12px] text-zinc-500 font-medium hidden sm:block">
                Curated intelligence &bull; Ranked notifications &bull; Morning briefing
              </p>
            </div>
          </div>

          {/* Right: Cmd+K Trigger + Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 h-9 px-3.5 rounded-full bg-white border border-zinc-200/80 shadow-xs hover:shadow-sm hover:border-zinc-300 text-zinc-500 text-[13px] font-medium transition-all"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span>Search or command...</span>
              <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-bold font-mono bg-zinc-100 text-zinc-600 border border-zinc-200 rounded">
                ⌘K
              </kbd>
            </button>

            {/* Resend Email Button */}
            {hasItems && (
              <button
                onClick={() => generateMutation.mutate(true)}
                disabled={generateMutation.isPending}
                className="hidden md:inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white border border-zinc-200/80 shadow-xs hover:bg-zinc-50 text-zinc-700 text-[13px] font-semibold transition-all active:scale-95"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Resend Email</span>
              </button>
            )}

            {/* Re-rank / Generate Briefing Button (Executive Dark) */}
            <button
              onClick={() => generateMutation.mutate(false)}
              disabled={generateMutation.isPending || isDigestFetching}
              className="inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-4 rounded-full bg-zinc-900 text-white shadow-md hover:bg-black text-[12px] sm:text-[13px] font-semibold transition-all duration-200 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={1.75} />
              <span className="hidden xs:inline">{hasItems ? 'Re-rank' : 'Generate'}</span>
            </button>

            {/* Right Panel Toggle (for screens < 1536px) */}
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="2xl:hidden p-1.5 sm:p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors ml-0.5"
              aria-label="Toggle intelligence panel"
              title="Toggle intelligence panel"
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 2xl:p-10 max-w-[1200px] w-full mx-auto pb-24 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Right Panel Backdrop on < 2xl screens */}
      {isRightPanelOpen && (
        <div
          className="fixed inset-0 z-25 bg-zinc-950/40 backdrop-blur-xs 2xl:hidden"
          onClick={() => setIsRightPanelOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* 3. RIGHT CONTEXT INTELLIGENCE PANEL (360px, Fills Right)   */}
      {/* ========================================================= */}
      <aside
        className={cn(
          'w-[340px] 2xl:w-[360px] h-screen bg-white border-l border-zinc-200/80 overflow-y-auto flex flex-col p-5 2xl:p-6 space-y-6 shrink-0 z-30 transition-transform duration-300 select-none shadow-2xl 2xl:shadow-none',
          'fixed inset-y-0 right-0 2xl:static 2xl:translate-x-0',
          isRightPanelOpen ? 'translate-x-0' : 'translate-x-full 2xl:translate-x-0'
        )}
      >
        {/* Right Panel Header on < 2xl screens */}
        <div className="flex items-center justify-between 2xl:hidden pb-2 border-b border-zinc-100">
          <span className="font-display font-bold text-base text-zinc-900">
            Intelligence Panel
          </span>
          <button
            onClick={() => setIsRightPanelOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Next Brief Countdown Card (Gradient from-indigo-600 to-violet-600) */}
        <div className="rounded-[20px] bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-indigo relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">
              Next Daily Brief
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Scheduled</span>
            </div>
          </div>

          <p className="font-display font-bold text-[28px] text-white tracking-tight tabular-nums">
            in {timeLeft.hours}h {timeLeft.minutes}m
          </p>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(5, ((24 - timeLeft.hours) / 24) * 100)
                )}%`,
              }}
            />
          </div>

          <p className="text-[11.5px] text-white/80 mt-2 font-medium">
            Delivery at {user?.profile?.digest_time?.slice(0, 5) || '07:00'} ({user?.profile?.timezone || 'Asia/Kolkata'})
          </p>
        </div>

        {/* 2. Today's Intelligence Stats (2x2 Bento Grid) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              Intelligence Metrics
            </span>
            {isDelivered && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Delivered
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[16px] bg-zinc-50 border border-zinc-200/70 p-3.5 space-y-1">
              <p className="font-display font-bold text-[22px] text-zinc-900 tabular-nums leading-none">
                {digest?.item_count || 0}
              </p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                Items Synthesized
              </p>
            </div>

            <div className="rounded-[16px] bg-zinc-50 border border-zinc-200/70 p-3.5 space-y-1">
              <p className="font-display font-bold text-[22px] text-zinc-900 tabular-nums leading-none">
                {digest?.important_count || 0}
              </p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                Priority Items
              </p>
            </div>

            <div className="rounded-[16px] bg-zinc-50 border border-zinc-200/70 p-3.5 space-y-1">
              <p className="font-display font-bold text-[22px] text-zinc-900 tabular-nums leading-none">
                {digest?.llm_cost_cents ? `${digest.llm_cost_cents}¢` : '0¢'}
              </p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                AI LLM Cost
              </p>
            </div>

            <div className="rounded-[16px] bg-zinc-50 border border-zinc-200/70 p-3.5 space-y-1">
              <p className="font-display font-bold text-[22px] text-zinc-900 tabular-nums leading-none">
                {digest?.item_count ? `${Math.ceil(digest.item_count * 0.8)}m` : '0m'}
              </p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                Reading Time
              </p>
            </div>
          </div>
        </div>

        {/* 3. Live Pipeline Stream Ticker */}
        <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              Live Ingestion Ticker
            </span>
            <button
              onClick={() => refetchRaw()}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[260px]">
            {isRawFetching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-zinc-100 animate-pulse" />
                ))}
              </div>
            ) : rawItems.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">
                No items ingested yet today.
              </p>
            ) : (
              rawItems.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-100/70 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">
                      {item.connection_name || 'Feed'}
                    </span>
                    <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">
                      {formatRelativeTime(item.received_at)}
                    </span>
                  </div>
                  <p className="text-[12.5px] font-medium text-zinc-800 line-clamp-1">
                    {item.title}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Quick Actions */}
        <div className="pt-4 border-t border-zinc-100 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
            Quick Actions
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                refetchDigest()
                refetchRaw()
                addToast({ type: 'info', title: 'Refreshing', description: 'Checking newest feed items.' })
              }}
              className="h-9 px-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/70 text-zinc-700 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync All</span>
            </button>

            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/70 text-zinc-700 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>OpenAPI</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onRerank={() => generateMutation.mutate(false)}
        onResendEmail={() => generateMutation.mutate(true)}
        onSyncAll={() => {
          refetchRaw()
          refetchDigest()
        }}
      />

      {/* Mobile Bottom Navigation Bar (phones & tablets < lg) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-[#0F0F0F] border-t border-zinc-800 z-30 flex items-center justify-around px-2 text-white shadow-2xl">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[11px] font-medium transition-colors relative',
                isActive ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <div className="relative">
                {item.icon}
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px] sm:text-[11px]">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  )
}
