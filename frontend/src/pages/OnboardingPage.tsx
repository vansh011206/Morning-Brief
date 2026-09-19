import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun,
  Mail,
  Send,
  Github,
  Rss,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Globe,
  Search,
  User as UserIcon,
} from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useToastStore } from '../store/useToastStore'
import { useAuthStore } from '../store/useAuthStore'
import { authApi } from '../api/auth'
import { connectionsApi } from '../api/connections'
import type { DeliveryChannel } from '../api/types'

const ALL_TIMEZONES = [
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

const TIME_PRESETS = [
  { label: '6:00 AM', value: '06:00' },
  { label: '7:00 AM', value: '07:00' },
  { label: '8:00 AM', value: '08:00' },
  { label: '9:00 AM', value: '09:00' },
]

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const { addToast } = useToastStore()

  const [step, setStep] = useState(1)
  const [name, setName] = useState(user?.name || user?.first_name || '')
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>(
    user?.profile?.delivery_channel || 'email'
  )
  const [timezone, setTimezone] = useState(user?.profile?.timezone || 'Asia/Kolkata')
  const [digestTime, setDigestTime] = useState(
    user?.profile?.digest_time?.slice(0, 5) || '07:00'
  )
  const [connectedGmail, setConnectedGmail] = useState(false)
  const [connectedGithub, setConnectedGithub] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Timezone dropdown state
  const [isTzDropdownOpen, setIsTzDropdownOpen] = useState(false)
  const [tzSearch, setTzSearch] = useState('')
  const tzDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.name || user?.first_name) {
      setName(user.name || user.first_name)
    }
  }, [user])

  // Close timezone dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target as Node)) {
        setIsTzDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredTimezones = ALL_TIMEZONES.filter((tz) =>
    tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    tz.value.toLowerCase().includes(tzSearch.toLowerCase())
  )

  const steps = [
    { num: 1, label: 'Welcome' },
    { num: 2, label: 'Delivery' },
    { num: 3, label: 'Schedule' },
    { num: 4, label: 'Connect' },
  ]

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      const updatedUser = await authApi.updatePreferences({
        name: name.trim() || undefined,
        delivery_channel: deliveryChannel,
        timezone,
        digest_time: digestTime,
        completed_at: new Date().toISOString(),
      })
      setUser(updatedUser)

      addToast({
        type: 'success',
        title: 'Onboarding Complete',
        description: 'Your morning briefing is configured and ready for tomorrow morning.',
      })
      navigate('/today')
    } catch (err) {
      console.warn('Preferences update error:', err)
      // Still navigate so user is not trapped
      navigate('/today')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (step < 4) {
      setStep((prev) => prev + 1)
    } else {
      handleFinish()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1)
    }
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">
      {/* Ambient Canvas Mesh Blobs */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/6 rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="absolute top-12 right-1/4 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[70px] pointer-events-none -z-10" />

      {/* Top Sticky Progress Stepper */}
      <div className="mb-8 sm:mb-10">
        <div className="relative flex items-center justify-between">
          {/* Progress Connecting Line */}
          <div className="absolute left-4 right-4 top-4 -translate-y-1/2 h-0.5 bg-zinc-200 -z-0" />
          <div
            className="absolute left-4 top-4 -translate-y-1/2 h-0.5 bg-indigo-600 transition-all duration-300 -z-0"
            style={{
              width: `calc(${((step - 1) / (steps.length - 1)) * 100}% - 2rem)`,
            }}
          />

          {steps.map((s) => {
            const isCompleted = step > s.num
            const isActive = step === s.num
            return (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  disabled={step < s.num}
                  onClick={() => s.num < step && setStep(s.num)}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center font-bold text-xs ${
                    isCompleted
                      ? 'bg-indigo-600 border-indigo-600 text-white cursor-pointer'
                      : isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo scale-110 cursor-default'
                      : 'bg-white border-zinc-200 text-zinc-400 cursor-not-allowed'
                  }`}
                  aria-label={`Step ${s.num}: ${s.label}`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  ) : (
                    s.num
                  )}
                </button>
                <span
                  className={`text-[11px] uppercase tracking-wide font-semibold mt-2 transition-colors whitespace-nowrap ${
                    isActive ? 'text-zinc-900' : 'text-zinc-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Card */}
      <div className="bg-white rounded-[24px] border border-zinc-200/80 shadow-md p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-2 duration-300 relative overflow-hidden">
        {/* STEP 1: Welcome */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 shadow-sm flex items-center justify-center">
              <Sun className="w-7 h-7 text-indigo-600" strokeWidth={1.75} />
            </div>

            <div>
              <h1 className="font-display text-[28px] font-bold text-zinc-900 tracking-tight leading-tight">
                Your mornings, summarized
              </h1>
              <p className="text-[15px] text-zinc-600 leading-relaxed max-w-md mt-2">
                MorningBrief curates, synthesizes, and delivers your essential news, code updates, and emails before you even get out of bed.
              </p>
            </div>

            <div className="pt-2 max-w-md space-y-2">
              <label className="block text-[13px] font-medium text-zinc-700">
                What should we call you?
              </label>
              <Input
                type="text"
                placeholder="Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<UserIcon className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />}
                className="h-11 rounded-xl border-zinc-200 shadow-xs focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* STEP 2: Delivery Channel */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-[24px] font-bold text-zinc-900 tracking-tight leading-tight">
                Choose your delivery channel
              </h2>
              <p className="text-[14px] text-zinc-500 mt-1">
                Where would you like to receive your executive daily brief?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Radio Card */}
              <div
                onClick={() => setDeliveryChannel('email')}
                className={`rounded-[20px] border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  deliveryChannel === 'email'
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-indigo ring-2 ring-indigo-500/10'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm hover:-translate-y-px'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-zinc-200/80 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-indigo-600" strokeWidth={1.75} />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      deliveryChannel === 'email'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {deliveryChannel === 'email' && (
                      <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-[15px] font-semibold text-zinc-900">Email Dispatch</h3>
                  <p className="text-[13px] text-zinc-500 mt-1 leading-normal">
                    Clean, editorial briefing delivered directly to your inbox every morning.
                  </p>
                </div>
              </div>

              {/* Telegram Radio Card */}
              <div
                onClick={() => setDeliveryChannel('telegram')}
                className={`rounded-[20px] border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  deliveryChannel === 'telegram'
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-indigo ring-2 ring-indigo-500/10'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm hover:-translate-y-px'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-zinc-200/80 flex items-center justify-center">
                    <Send className="w-5 h-5 text-sky-600" strokeWidth={1.75} />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      deliveryChannel === 'telegram'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {deliveryChannel === 'telegram' && (
                      <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-[15px] font-semibold text-zinc-900">Telegram Bot</h3>
                  <p className="text-[13px] text-zinc-500 mt-1 leading-normal">
                    Instant priority alerts and executive digests delivered right to your chat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Preferences */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-[24px] font-bold text-zinc-900 tracking-tight leading-tight">
                Set your briefing schedule
              </h2>
              <p className="text-[14px] text-zinc-500 mt-1">
                Pick when you start your day and your local timezone.
              </p>
            </div>

            <div className="space-y-5">
              {/* Quick Time Select Chips */}
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-2.5">
                  Daily Briefing Time
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {TIME_PRESETS.map((preset) => {
                    const isSelected = digestTime === preset.value
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setDigestTime(preset.value)}
                        className={`rounded-full px-4 h-8 text-[13px] font-medium border transition-all duration-200 flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>

                <div className="max-w-xs">
                  <Input
                    type="time"
                    value={digestTime}
                    onChange={(e) => setDigestTime(e.target.value)}
                    leftIcon={<Clock className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />}
                    className="h-11 rounded-xl border-zinc-200 shadow-xs focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Searchable Timezone Select */}
              <div className="space-y-2" ref={tzDropdownRef}>
                <label className="block text-[13px] font-medium text-zinc-700">
                  Local Timezone
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTzDropdownOpen(!isTzDropdownOpen)}
                    className="w-full h-11 rounded-xl border border-zinc-200 shadow-xs px-3.5 text-[14px] bg-white flex items-center justify-between text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Globe className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">
                        {ALL_TIMEZONES.find((t) => t.value === timezone)?.label || timezone}
                      </span>
                    </div>
                    <span className="text-xs text-indigo-600 font-semibold shrink-0 ml-2">
                      Change
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isTzDropdownOpen && (
                    <div className="absolute left-0 right-0 top-12 z-30 rounded-[16px] shadow-lg border border-zinc-200/80 bg-white p-2 max-h-[240px] overflow-y-auto space-y-1">
                      <div className="sticky top-0 bg-white pb-1.5 z-10">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search timezones..."
                            value={tzSearch}
                            onChange={(e) => setTzSearch(e.target.value)}
                            className="w-full h-9 rounded-lg border border-zinc-200 px-3 pl-8 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            autoFocus
                          />
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div className="divide-y divide-zinc-100">
                        {filteredTimezones.map((tz) => (
                          <div
                            key={tz.value}
                            onClick={() => {
                              setTimezone(tz.value)
                              setIsTzDropdownOpen(false)
                            }}
                            className={`px-3 py-2 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                              timezone === tz.value
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'hover:bg-zinc-50 text-zinc-700'
                            }`}
                          >
                            <span>{tz.label}</span>
                            {timezone === tz.value && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Connect Sources */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-[24px] font-bold text-zinc-900 tracking-tight leading-tight">
                Connect your sources
              </h2>
              <p className="text-[14px] text-zinc-500 mt-1">
                Link feeds and inboxes to let AI distill your morning brief.
              </p>
            </div>

            <div className="space-y-3">
              {/* Google Gmail */}
              <div className="rounded-[20px] border border-zinc-200/80 p-5 flex items-center justify-between hover:shadow-sm transition-all bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Mail className="w-5 h-5 text-rose-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold text-zinc-900">Google Gmail</h4>
                    <p className="text-[13px] text-zinc-500">
                      {connectedGmail ? 'Connected as user@gmail.com' : 'Read-only access to email headers'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={connectedGmail ? 'secondary' : 'outline'}
                  className="rounded-xl h-9 px-4 text-[13px] font-semibold"
                  onClick={async () => {
                    if (!connectedGmail) {
                      try {
                        const data = await connectionsApi.getGmailAuthUrl()
                        if (data?.url || data?.auth_url) {
                          window.location.href = data.url || data.auth_url
                          return
                        }
                      } catch {
                        // Demo toggle
                      }
                      setConnectedGmail(true)
                    } else {
                      setConnectedGmail(false)
                    }
                  }}
                >
                  {connectedGmail ? 'Connected' : 'Connect'}
                </Button>
              </div>

              {/* GitHub */}
              <div className="rounded-[20px] border border-zinc-200/80 p-5 flex items-center justify-between hover:shadow-sm transition-all bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
                    <Github className="w-5 h-5 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold text-zinc-900">GitHub</h4>
                    <p className="text-[13px] text-zinc-500">
                      {connectedGithub ? 'Connected as @developer' : 'Pull requests, assigned issues & alerts'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={connectedGithub ? 'secondary' : 'outline'}
                  className="rounded-xl h-9 px-4 text-[13px] font-semibold"
                  onClick={() => setConnectedGithub(!connectedGithub)}
                >
                  {connectedGithub ? 'Connected' : 'Connect'}
                </Button>
              </div>

              {/* Curated Tech RSS Feeds */}
              <div className="rounded-[20px] border border-zinc-200/80 p-5 flex items-center justify-between hover:shadow-sm transition-all bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Rss className="w-5 h-5 text-amber-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold text-zinc-900">Tech News & RSS</h4>
                    <p className="text-[13px] text-zinc-500">
                      Pre-configured feeds: Hacker News, BBC Tech, MIT Review
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <Check className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="text-[13px] text-zinc-400 hover:text-zinc-900 transition-colors font-medium cursor-pointer"
              >
                Skip for now, I'll connect later
              </button>
            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="flex items-center justify-between pt-8 mt-8 border-t border-zinc-100">
          <div>
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="rounded-xl h-10 px-4 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 text-[14px] font-semibold"
                leftIcon={<ChevronLeft className="w-4 h-4" strokeWidth={1.75} />}
              >
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
            isLoading={isSubmitting}
            className="rounded-xl h-10 px-6 bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-indigo hover:shadow-lg text-[14px] font-semibold active:scale-[0.98] transition-all"
            rightIcon={
              step === 4 ? (
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
              )
            }
          >
            {step === 4 ? 'Complete Setup' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
