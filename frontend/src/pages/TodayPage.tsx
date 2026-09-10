import React, { useState } from 'react'
import {
  Sparkles,
  Filter,
  CheckCircle2,
  ExternalLink,
  Briefcase,
  GitPullRequest,
  Mail,
  Clock,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  SegmentedTabs,
  SkeletonFeedCard,
} from '../components/ui'
import { useToastStore } from '../store/useToastStore'

export const TodayPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [readItems, setReadItems] = useState<Record<number, boolean>>({})
  const { addToast } = useToastStore()

  const tabs = [
    { id: 'all', label: 'All Ranked', badge: 3 },
    { id: 'urgent', label: 'Urgent', badge: 1 },
    { id: 'recruiters', label: 'Recruiters', badge: 1 },
    { id: 'github', label: 'GitHub PRs', badge: 1 },
  ]

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      addToast({
        type: 'success',
        title: 'Digest Compiled',
        description: 'Your morning briefings have been refreshed and ranked by priority.',
      })
    }, 1200)
  }

  const toggleItemRead = (id: number) => {
    setReadItems((prev) => {
      const updated = !prev[id]
      addToast({
        type: 'info',
        title: updated ? 'Marked as Read' : 'Marked as Unread',
        description: `Brief item #${id} status updated.`,
      })
      return { ...prev, [id]: updated }
    })
  }

  // Demo preview items reflecting ranked digest structure
  const previewItems = [
    {
      id: 1,
      rank: 1,
      priority: 'critical' as const,
      category: 'recruiter' as const,
      categoryLabel: 'Recruiter / Career',
      icon: <Briefcase className="w-4 h-4 text-emerald-600" />,
      source: 'Gmail',
      sender: 'sarah.talents@scale.ai',
      title: 'Senior Full-Stack Architect: Intro conversation & technical briefing',
      summary:
        'Talent Lead at Scale AI reached out regarding a Senior Architect opening matching your distributed systems background. Requests a 20-minute chat this week.',
      actionItems: ['Review salary band', 'Reply to schedule Thursday sync'],
      receivedAgo: '3h ago',
    },
    {
      id: 2,
      rank: 2,
      priority: 'high' as const,
      category: 'code_review' as const,
      categoryLabel: 'GitHub Pull Request',
      icon: <GitPullRequest className="w-4 h-4 text-primary-600" />,
      source: 'GitHub',
      sender: 'dependabot[bot]',
      title: 'PR #142: Security update for cryptographic dependency and JWT validator',
      summary:
        'Automated pull request upgrading cryptography token verification library. CI build passed with 100% test coverage.',
      actionItems: ['Approve & merge pull request'],
      receivedAgo: '5h ago',
    },
    {
      id: 3,
      rank: 3,
      priority: 'medium' as const,
      category: 'general' as const,
      categoryLabel: 'Team Announcement',
      icon: <Mail className="w-4 h-4 text-zinc-600" />,
      source: 'Gmail',
      sender: 'eng-all@company.com',
      title: 'Q3 Product Roadmap Review & All-Hands presentation slides',
      summary:
        'Summary of Q3 engineering objectives, migration milestones for Daphne ASGI server, and upcoming team offsite schedule.',
      actionItems: ['Review slide 14 regarding API roadmap'],
      receivedAgo: '7h ago',
    },
  ]

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900 tracking-tight">
              Today's Briefing
            </h1>
            <Badge variant="amber" size="md">
              Live Preview
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Synthesizing unread notifications from Gmail and GitHub into a ranked morning digest.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="amber"
            isLoading={isGenerating}
            onClick={handleGenerate}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Re-rank Briefing
          </Button>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Ranked by AI priority score</span>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {previewItems.map((item) => {
          const isRead = readItems[item.id] || false
          return (
            <Card
              key={item.id}
              hoverable
              className={isRead ? 'opacity-70 bg-zinc-50/70' : 'bg-white'}
            >
              <CardHeader className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center font-display font-bold text-xs text-zinc-700 tabular-nums">
                    #{item.rank}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-xs font-semibold text-zinc-700">
                      {item.source}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {item.sender}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      item.priority === 'critical'
                        ? 'rose'
                        : item.priority === 'high'
                        ? 'amber'
                        : 'indigo'
                    }
                    dot
                  >
                    {item.priority.toUpperCase()}
                  </Badge>
                  <span className="text-[11px] text-zinc-400 hidden sm:inline flex items-center gap-1">
                    <Clock className="w-3 h-3 inline" />
                    {item.receivedAgo}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-2 pb-4">
                <CardTitle className="text-base font-semibold text-zinc-900 leading-snug">
                  {item.title}
                </CardTitle>
                <CardDescription className="text-sm text-zinc-600 mt-2 leading-relaxed">
                  {item.summary}
                </CardDescription>

                {item.actionItems.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-100/90 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Suggested Actions:
                    </span>
                    {item.actionItems.map((action, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 font-medium border border-zinc-200/60"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="py-2.5 px-5 bg-zinc-50/40">
                <Button
                  size="sm"
                  variant={isRead ? 'secondary' : 'outline'}
                  onClick={() => toggleItemRead(item.id)}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {isRead ? 'Read' : 'Mark as Read'}
                </Button>

                <a
                  href="#external"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  <span>Open Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Skeleton Loading State Preview Demonstration */}
      <div className="pt-6 border-t border-zinc-200/80">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
            Incoming Queue Placeholder Skeletons
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonFeedCard />
          <SkeletonFeedCard />
        </div>
      </div>
    </div>
  )
}
