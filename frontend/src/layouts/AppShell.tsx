import React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Sun,
  Inbox,
  Archive,
  Link2,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { CountdownPill } from '../components/ui/CountdownPill'
import { Avatar } from '../components/ui/Avatar'
import { Tooltip } from '../components/ui/Tooltip'
import { ToastContainer } from '../components/ui/Toast'
import { useAuthStore } from '../store/useAuthStore'
import { authApi } from '../api/auth'
import { cn } from '../utils/cn'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { to: '/today', label: 'Today', icon: <Inbox className="w-5 h-5" /> },
  { to: '/archive', label: 'Archive', icon: <Archive className="w-5 h-5" /> },
  { to: '/connections', label: 'Connections', icon: <Link2 className="w-5 h-5" /> },
  { to: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
]

export const AppShell: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const refresh = useAuthStore.getState().refreshToken
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        // Ignore network/expiry errors on logout
      }
    }
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-zinc-900 selection:bg-primary-100 selection:text-primary-900">
      {/* Soft Canvas Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none canvas-glow z-0" />

      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 w-full glass-header border-b border-zinc-200/70 h-16 transition-colors">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Logo Tile + Wordmark */}
          <NavLink to="/" className="flex items-center gap-3 group shrink-0 outline-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white shadow-sm group-hover:shadow-amber-glow transition-all duration-200">
              <Sun className="w-5 h-5 text-amber-50" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight text-zinc-900 leading-none">
                MorningBrief
              </span>
              <span className="text-[10px] font-medium tracking-wide uppercase text-zinc-400 mt-1">
                Personal AI Intelligence
              </span>
            </div>
          </NavLink>

          {/* Center Countdown Pill */}
          <div className="hidden md:flex items-center justify-center">
            <CountdownPill targetTime={user?.profile?.digest_time || '07:00'} />
          </div>

          {/* Right Actions & Profile */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>v1.0 Ready</span>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <NavLink to="/settings" className="outline-none">
                  <Avatar
                    name={user?.first_name || user?.username || user?.email}
                    size="sm"
                    online={true}
                  />
                </NavLink>
                <button
                  onClick={handleLogout}
                  aria-label="Log out"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <NavLink
                  to="/login"
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  Sign In
                </NavLink>
                <NavLink
                  to="/register"
                  className="text-xs font-medium text-white bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-lg shadow-sm transition-all duration-150"
                >
                  Get Started
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10">
        {/* Desktop Left Icon Rail (lg+ screens) */}
        <aside className="hidden lg:flex flex-col items-center py-6 px-3 w-20 shrink-0 border-r border-zinc-200/70 glass-header sticky top-16 h-[calc(100vh-4rem)] justify-between">
          <nav className="flex flex-col items-center gap-4 w-full" aria-label="Desktop navigation">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to)
              return (
                <Tooltip key={item.to} content={item.label} position="right">
                  <NavLink
                    to={item.to}
                    className={cn(
                      'w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 relative group select-none outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isActive
                        ? 'bg-primary-light text-primary-700 font-medium shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                    )}
                  >
                    {item.icon}
                    <span className="text-[10px] tracking-tight leading-none mt-0.5">
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                  </NavLink>
                </Tooltip>
              )
            })}
          </nav>

          <div className="flex flex-col items-center gap-3">
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-primary hover:bg-primary-light transition-colors"
              title="OpenAPI Docs"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
          {/* Mobile countdown pill */}
          <div className="md:hidden flex justify-center mb-5">
            <CountdownPill targetTime={user?.profile?.digest_time || '07:00'} />
          </div>
          <Outlet />
        </main>
      </div>

      {/* Modern Footer */}
      <footer className="w-full border-t border-zinc-200/70 bg-white/60 py-6 text-xs text-zinc-500 relative z-10 pb-24 lg:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-zinc-700">MorningBrief Orchestrator</span>
            <span>•</span>
            <span>Django 5.2 LTS + Daphne ASGI</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <span>API Specs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <span>Ranked Intelligence System</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar (< lg screens, touch-friendly, no overflow on 360px) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-lg px-2 py-1.5"
      >
        <div className="flex items-center justify-around w-full max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors select-none outline-none',
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 active:bg-zinc-100'
                )}
              >
                <div
                  className={cn(
                    'p-1 rounded-lg transition-transform duration-150',
                    isActive && 'bg-primary-light scale-105'
                  )}
                >
                  {item.icon}
                </div>
                <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  )
}
