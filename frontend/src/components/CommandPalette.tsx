import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Inbox,
  Archive,
  Link2,
  Settings,
  Sparkles,
  Mail,
  RefreshCw,
  ExternalLink,
  Command,
} from 'lucide-react'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
  category: 'Navigation' | 'Actions' | 'External'
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onRerank?: () => void
  onResendEmail?: () => void
  onSyncAll?: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onRerank,
  onResendEmail,
  onSyncAll,
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const commands: CommandItem[] = [
    {
      id: 'nav-today',
      title: 'Today’s Briefing',
      subtitle: 'View today’s synthesized intelligence',
      icon: <Inbox className="w-4 h-4 text-zinc-500" />,
      action: () => {
        navigate('/today')
        onClose()
      },
      category: 'Navigation',
    },
    {
      id: 'nav-archive',
      title: 'Briefing Archive',
      subtitle: 'Search past synthesized briefings',
      icon: <Archive className="w-4 h-4 text-zinc-500" />,
      action: () => {
        navigate('/archive')
        onClose()
      },
      category: 'Navigation',
    },
    {
      id: 'nav-connections',
      title: 'Connected Sources',
      subtitle: 'Manage RSS, Gmail, GitHub & Telegram',
      icon: <Link2 className="w-4 h-4 text-zinc-500" />,
      action: () => {
        navigate('/connections')
        onClose()
      },
      category: 'Navigation',
    },
    {
      id: 'nav-settings',
      title: 'Preferences & Settings',
      subtitle: 'Delivery time, timezone, and delivery channel',
      icon: <Settings className="w-4 h-4 text-zinc-500" />,
      action: () => {
        navigate('/settings')
        onClose()
      },
      category: 'Navigation',
    },
    {
      id: 'act-rerank',
      title: 'Re-rank Briefing',
      subtitle: 'Trigger LLM synthesis for today’s briefing',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      action: () => {
        onRerank?.()
        onClose()
      },
      category: 'Actions',
    },
    {
      id: 'act-resend',
      title: 'Resend Email Briefing',
      subtitle: 'Deliver today’s briefing to your email inbox',
      icon: <Mail className="w-4 h-4 text-indigo-500" />,
      action: () => {
        onResendEmail?.()
        onClose()
      },
      category: 'Actions',
    },
    {
      id: 'act-sync',
      title: 'Sync All Sources',
      subtitle: 'Fetch newest items from all active connections',
      icon: <RefreshCw className="w-4 h-4 text-emerald-500" />,
      action: () => {
        onSyncAll?.()
        onClose()
      },
      category: 'Actions',
    },
    {
      id: 'ext-api',
      title: 'API Documentation (OpenAPI)',
      subtitle: 'Interactive Swagger / Redoc specs',
      icon: <ExternalLink className="w-4 h-4 text-zinc-400" />,
      action: () => {
        window.open('http://127.0.0.1:8000/api/v1/docs/', '_blank')
        onClose()
      },
      category: 'External',
    },
  ]

  const filteredCommands = commands.filter((cmd) => {
    const q = query.toLowerCase()
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q))
    )
  })

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev === 0 ? (filteredCommands.length || 1) - 1 : prev - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] bg-white rounded-[20px] border border-zinc-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-zinc-200/70 h-14 bg-white">
          <Search className="w-5 h-5 text-zinc-400 mr-3 shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Type a command or search..."
            className="w-full h-full text-[15px] bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md shrink-0">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
                    isSelected ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white shadow-xs' : 'bg-zinc-100'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="truncate">
                      <p className="text-[14px] font-medium text-zinc-900 truncate leading-snug">
                        {cmd.title}
                      </p>
                      {cmd.subtitle && (
                        <p className="text-[12px] text-zinc-400 truncate">
                          {cmd.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 shrink-0 ml-3">
                    {cmd.category}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded shadow-xs font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded shadow-xs font-mono">↵</kbd> select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" /> Command Center
          </span>
        </div>
      </div>
    </div>
  )
}
