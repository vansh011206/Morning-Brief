import React, { useState } from 'react'
import {
  Mail,
  Github,
  Send,
  Calendar,
  RefreshCw,
  Plus,
  Unlink,
  ShieldCheck,
  Inbox,
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
  EmptyState,
} from '../components/ui'
import { useToastStore } from '../store/useToastStore'

interface ServiceConnection {
  id: string
  name: string
  provider: 'gmail' | 'github' | 'telegram' | 'calendar'
  account?: string
  status: 'connected' | 'not_connected' | 'coming_soon'
  syncedAgo?: string
  privacyCopy: string
}

export const ConnectionsPage: React.FC = () => {
  const { addToast } = useToastStore()
  const [showEmptyView, setShowEmptyView] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Mock initial connections state (can be toggled to demonstrate empty state)
  const [connections, setConnections] = useState<ServiceConnection[]>([
    {
      id: 'gmail',
      name: 'Google Gmail',
      provider: 'gmail',
      account: 'alex.rivera@gmail.com',
      status: 'connected',
      syncedAgo: '5 min ago',
      privacyCopy:
        'Read-only access to notification headers & message snippets. Never stores passwords or full email archives.',
    },
    {
      id: 'github',
      name: 'GitHub',
      provider: 'github',
      account: '@alexrivera',
      status: 'connected',
      syncedAgo: '12 min ago',
      privacyCopy:
        'Read-only alerts for assigned pull requests, code reviews, and mention notifications.',
    },
    {
      id: 'telegram',
      name: 'Telegram Messenger',
      provider: 'telegram',
      status: 'not_connected',
      privacyCopy:
        'Direct webhook bot messaging. Bot pairs securely with your chat ID without accessing private personal chats.',
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      provider: 'calendar',
      status: 'coming_soon',
      privacyCopy:
        'Synthesizes upcoming meetings, agenda items, and focus blocks into your morning brief.',
    },
  ])

  const handleSync = (service: ServiceConnection) => {
    setSyncingId(service.id)
    setTimeout(() => {
      setSyncingId(null)
      setConnections((prev) =>
        prev.map((c) =>
          c.id === service.id ? { ...c, syncedAgo: 'Just now' } : c
        )
      )
      addToast({
        type: 'success',
        title: 'Sync Complete',
        description: `Successfully synchronized fresh feeds from ${service.name}.`,
      })
    }, 1000)
  }

  const handleConnect = (service: ServiceConnection) => {
    addToast({
      type: 'info',
      title: `${service.name} Integration`,
      description: `${service.name} live OAuth is scheduled for Phase 5/8. Mock connection registered.`,
    })
    setConnections((prev) =>
      prev.map((c) =>
        c.id === service.id
          ? {
              ...c,
              status: 'connected',
              account: 'connected.user@service.com',
              syncedAgo: 'Just now',
            }
          : c
      )
    )
  }

  const handleDisconnect = (service: ServiceConnection) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === service.id
          ? { ...c, status: 'not_connected', account: undefined, syncedAgo: undefined }
          : c
      )
    )
    addToast({
      type: 'warning',
      title: 'Channel Disconnected',
      description: `Disconnected ${service.name} from your morning briefing pipeline.`,
    })
  }

  const getServiceChip = (provider: ServiceConnection['provider']) => {
    switch (provider) {
      case 'gmail':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose shrink-0">
            <Mail className="w-5 h-5" />
          </div>
        )
      case 'github':
        return (
          <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 shrink-0">
            <Github className="w-5 h-5" />
          </div>
        )
      case 'telegram':
        return (
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <Send className="w-5 h-5" />
          </div>
        )
      case 'calendar':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        )
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900 tracking-tight">
              Connected Channels
            </h1>
            <Badge variant="indigo" size="md">
              Data Ingestion
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Manage active feeds and authentication tokens. MorningBrief only ingests notification summaries to assemble your morning briefing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmptyView(!showEmptyView)}
          >
            {showEmptyView ? 'Show Services' : 'Simulate Empty State'}
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Channel
          </Button>
        </div>
      </div>

      {/* Empty State View */}
      {showEmptyView ? (
        <EmptyState
          icon={<Inbox className="w-6 h-6" />}
          title="No Channels Connected"
          description="Connect your Gmail, GitHub, or Telegram accounts to begin compiling intelligent ranked morning briefings."
          action={
            <Button
              variant="primary"
              onClick={() => setShowEmptyView(false)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Restore Connections
            </Button>
          }
        />
      ) : (
        /* Service Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {connections.map((service) => {
            const isConnected = service.status === 'connected'
            const isComingSoon = service.status === 'coming_soon'
            const isSyncing = syncingId === service.id

            return (
              <Card
                key={service.id}
                className="flex flex-col justify-between transition-all"
              >
                <div>
                  <CardHeader className="py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {getServiceChip(service.provider)}
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {service.name}
                        </CardTitle>
                        {service.account ? (
                          <p className="text-xs font-mono text-zinc-500 truncate">
                            {service.account}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-400">
                            {isComingSoon ? 'Roadmap integration' : 'Ready to connect'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isConnected ? (
                        <Badge variant="emerald" dot size="sm">
                          Connected · {service.syncedAgo}
                        </Badge>
                      ) : isComingSoon ? (
                        <Badge variant="zinc" size="sm">
                          Coming Soon
                        </Badge>
                      ) : (
                        <Badge variant="outline" size="sm">
                          Not connected
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="py-3">
                    {/* One-line Privacy Copy */}
                    <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                      <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{service.privacyCopy}</span>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="py-3 px-5 bg-zinc-50/50">
                  {isConnected ? (
                    <div className="flex items-center justify-between w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={isSyncing}
                        onClick={() => handleSync(service)}
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Sync Now
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnect(service)}
                        className="text-rose hover:bg-rose-50 hover:text-rose text-xs"
                      >
                        <Unlink className="w-3.5 h-3.5 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  ) : isComingSoon ? (
                    <div className="text-xs text-zinc-400 flex items-center justify-between w-full">
                      <span>Phase 8 Release</span>
                      <Button size="sm" variant="ghost" disabled>
                        Preview
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-zinc-400">Setup required</span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleConnect(service)}
                      >
                        Connect Channel
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Channel Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Communication Channel"
        description="Select an authorized service to integrate with MorningBrief."
      >
        <div className="space-y-3 pt-2">
          {connections
            .filter((c) => c.status === 'not_connected')
            .map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-zinc-200 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getServiceChip(c.provider)}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900">{c.name}</h4>
                    <p className="text-xs text-zinc-500 truncate max-w-xs">{c.privacyCopy}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleConnect(c)
                    setIsModalOpen(false)
                  }}
                >
                  Connect
                </Button>
              </div>
            ))}
          {connections.filter((c) => c.status === 'not_connected').length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-4">
              All currently available channels are connected.
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
