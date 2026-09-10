import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun,
  Mail,
  Send,
  ArrowRight,
  ArrowLeft,
  Check,
  Github,
  Sparkles,
  Search,
} from 'lucide-react'
import {
  Button,
  Card,
  Input,
  Badge,
} from '../components/ui'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import { authApi } from '../api/auth'
import type { DeliveryChannel } from '../api/types'

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - UTC+05:30)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT - UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT - UTC-08:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT - UTC-06:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST - UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST - UTC+01:00)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST - UTC+01:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST - UTC+09:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - UTC+08:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - UTC+04:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT - UTC+10:00)' },
  { value: 'UTC', label: 'Universal Coordinated Time (UTC)' },
]

export const OnboardingPage: React.FC = () => {
  const { user, setUser, isAuthenticated } = useAuthStore()
  const { addToast } = useToastStore()
  const navigate = useNavigate()

  // Protect route: Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else if (user?.profile?.completed_at) {
      // If already onboarded, send to /today
      navigate('/today')
    }
  }, [isAuthenticated, user, navigate])

  // Resume step from localStorage to survive page refreshes
  const [step, setStep] = useState<number>(() => {
    const saved = localStorage.getItem('morningbrief_onboarding_step')
    return saved ? Math.min(Math.max(parseInt(saved, 10), 1), 4) : 1
  })

  useEffect(() => {
    localStorage.setItem('morningbrief_onboarding_step', step.toString())
  }, [step])

  // State
  const [name, setName] = useState(user?.name || user?.first_name || '')
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>(
    user?.profile?.delivery_channel || 'email'
  )
  const [digestTime, setDigestTime] = useState(user?.profile?.digest_time?.slice(0, 5) || '07:00')
  const [timezone, setTimezone] = useState(user?.profile?.timezone || 'Asia/Kolkata')
  const [tzSearch, setTzSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredTimezones = TIMEZONES.filter((tz) =>
    tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    tz.value.toLowerCase().includes(tzSearch.toLowerCase())
  )

  const handleConnectStub = (provider: string) => {
    addToast({
      type: 'info',
      title: `${provider} Connector`,
      description: `${provider} OAuth integration is coming in Phase 5/8. Mock connection registered.`,
    })
  }

  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true)
    try {
      const nowIso = new Date().toISOString()
      const updatedUser = await authApi.updatePreferences({
        name: name.trim(),
        timezone,
        digest_time: digestTime,
        delivery_channel: deliveryChannel,
        completed_at: nowIso,
      })

      setUser(updatedUser)
      localStorage.removeItem('morningbrief_onboarding_step')

      addToast({
        type: 'success',
        title: 'Onboarding Complete',
        description: 'Your morning briefing preferences have been successfully configured.',
      })

      navigate('/today')
    } catch (err: any) {
      console.error('Error saving onboarding preferences:', err)
      addToast({
        type: 'error',
        title: 'Failed to Save',
        description: 'Unable to save preferences. Please check your settings.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickChips = [
    { label: '6:00 AM', value: '06:00' },
    { label: '7:00 AM', value: '07:00' },
    { label: '8:00 AM', value: '08:00' },
  ]

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-8">
      {/* 4-Step Progress Indicator */}
      <div className="relative px-4 sm:px-8">
        <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-200 z-0" />
        <div className="relative z-10 flex items-center justify-between">
          {[
            { num: 1, label: 'Welcome' },
            { num: 2, label: 'Delivery' },
            { num: 3, label: 'Schedule' },
            { num: 4, label: 'Sources' },
          ].map((s) => {
            const isDone = step > s.num
            const isCurrent = step === s.num
            return (
              <div key={s.num} className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                    isDone
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary-100 shadow-sm'
                      : 'bg-white border-2 border-zinc-300 text-zinc-400'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-[11px] font-medium mt-2 whitespace-nowrap ${
                    isCurrent ? 'text-zinc-900 font-semibold' : 'text-zinc-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Container Card */}
      <Card className="p-6 sm:p-8 shadow-sm">
        {/* Step 1: Welcome & Name */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white shadow-md mb-4">
                <Sun className="w-8 h-8 text-amber-50" />
              </div>
              <h2 className="font-display font-bold text-2xl text-zinc-900 tracking-tight">
                Your mornings, summarized
              </h2>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">
                MorningBrief consolidates emails, pull requests, and vital alerts into a clean daily priority digest.
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4 pt-2">
              <Input
                label="What should we call you?"
                placeholder="e.g. Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                helperText="Used to personalize your daily morning summary briefing"
              />
            </div>

            <div className="flex justify-end pt-6 border-t border-zinc-100">
              <Button
                variant="primary"
                onClick={() => setStep(2)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Delivery
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Delivery Channel */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-zinc-900">
                Choose delivery channel
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Select where your intelligence briefing should arrive every morning.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Card */}
              <div
                onClick={() => setDeliveryChannel('email')}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                  deliveryChannel === 'email'
                    ? 'border-primary bg-primary-50/30 shadow-sm'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        deliveryChannel === 'email'
                          ? 'border-primary bg-primary text-white'
                          : 'border-zinc-300'
                      }`}
                    >
                      {deliveryChannel === 'email' && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <h3 className="font-semibold text-zinc-900 text-sm">Email Digest</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Formatted digest delivered directly to your registered email address.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100/80">
                  <span className="text-[11px] text-zinc-400 font-mono truncate block">
                    {user?.email}
                  </span>
                </div>
              </div>

              {/* Telegram Card */}
              <div
                onClick={() => setDeliveryChannel('telegram')}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                  deliveryChannel === 'telegram'
                    ? 'border-primary bg-primary-50/30 shadow-sm'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        deliveryChannel === 'telegram'
                          ? 'border-primary bg-primary text-white'
                          : 'border-zinc-300'
                      }`}
                    >
                      {deliveryChannel === 'telegram' && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <h3 className="font-semibold text-zinc-900 text-sm">Telegram Bot</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Instant message delivery via our dedicated Telegram bot.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100/80 flex items-center justify-between">
                  <Badge variant="amber" size="sm">
                    Add via /settings later
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep(3)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Schedule
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Schedule Preferences & Timezone */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-zinc-900">
                Briefing schedule & timezone
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Choose the exact hour your morning briefing is delivered.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
                  Preferred Delivery Time
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {quickChips.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setDigestTime(chip.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        digestTime === chip.value
                          ? 'bg-amber-sunrise-light border-amber-sunrise text-amber-800 shadow-sm'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <Input
                  type="time"
                  value={digestTime}
                  onChange={(e) => setDigestTime(e.target.value)}
                  helperText="24-hour delivery schedule"
                />
              </div>

              {/* Timezone Selector with Search Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Select Timezone
                </label>

                <div className="space-y-2">
                  <Input
                    placeholder="Search timezones (e.g. Kolkata, New York, London)..."
                    value={tzSearch}
                    onChange={(e) => setTzSearch(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />

                  <div className="max-h-44 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100 bg-white">
                    {filteredTimezones.map((tz) => (
                      <div
                        key={tz.value}
                        onClick={() => setTimezone(tz.value)}
                        className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          timezone === tz.value
                            ? 'bg-primary-50 text-primary-700 font-semibold'
                            : 'hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <span>{tz.label}</span>
                        {timezone === tz.value && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    ))}
                    {filteredTimezones.length === 0 && (
                      <div className="p-4 text-xs text-zinc-400 text-center">
                        No timezones match your search
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep(4)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Sources
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Connect Sources */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-zinc-900">
                Connect your feeds
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Link notification sources for MorningBrief to synthesize. You can also skip and connect later.
              </p>
            </div>

            <div className="space-y-3">
              {/* Gmail Card */}
              <div className="p-4 rounded-xl border border-zinc-200/90 bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-900">Google Gmail</h4>
                    <p className="text-xs text-zinc-500 truncate">
                      Unread priority emails, recruiter notes, and calendar invites.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConnectStub('Gmail')}
                >
                  Connect
                </Button>
              </div>

              {/* GitHub Card */}
              <div className="p-4 rounded-xl border border-zinc-200/90 bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 shrink-0">
                    <Github className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-900">GitHub</h4>
                    <p className="text-xs text-zinc-500 truncate">
                      Assigned reviews, pull requests, and mention notifications.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConnectStub('GitHub')}
                >
                  Connect
                </Button>
              </div>
            </div>

            {/* Privacy note */}
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200/60 text-xs text-zinc-500 leading-relaxed">
              <strong>Privacy Assurance:</strong> MorningBrief requests read-only header & snippet metadata. Your account credentials and raw communications are never retained or used for public training.
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleCompleteOnboarding}
                  isLoading={isSubmitting}
                >
                  I'll connect later
                </Button>
                <Button
                  variant="amber"
                  onClick={handleCompleteOnboarding}
                  isLoading={isSubmitting}
                  rightIcon={<Sparkles className="w-4 h-4" />}
                >
                  Finish Setup
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
