import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  Send,
  Briefcase,
  Save,
  Trash2,
  AlertTriangle,
  Mail,
  Shield,
  Search,
  Check,
} from 'lucide-react'
import {
  Button,
  Input,
  Switch,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Modal,
  Skeleton,
} from '../components/ui'
import { useToastStore } from '../store/useToastStore'
import { useAuthStore } from '../store/useAuthStore'
import { authApi } from '../api/auth'
import { digestApi } from '../api/digest'
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

export const SettingsPage: React.FC = () => {
  const { user, setUser, logout, isAuthenticated } = useAuthStore()
  const { addToast } = useToastStore()
  const navigate = useNavigate()

  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSendingTestBrief, setIsSendingTestBrief] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Form states
  const [name, setName] = useState(user?.name || user?.first_name || '')
  const [timezone, setTimezone] = useState(user?.profile?.timezone || 'Asia/Kolkata')
  const [digestTime, setDigestTime] = useState(user?.profile?.digest_time?.slice(0, 5) || '07:00')
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>(
    user?.profile?.delivery_channel || 'email'
  )
  const [telegramChatId, setTelegramChatId] = useState(user?.profile?.telegram_chat_id || '')
  const [jobHuntMode, setJobHuntMode] = useState(user?.profile?.job_hunt_mode ?? false)
  const [digestEnabled, setDigestEnabled] = useState(user?.profile?.digest_enabled ?? true)
  const [tzSearch, setTzSearch] = useState('')

  // Fetch freshest preferences on mount
  useEffect(() => {
    if (!isAuthenticated) return

    setIsLoadingProfile(true)
    authApi
      .getMe()
      .then((freshUser) => {
        setUser(freshUser)
        setName(freshUser.name || freshUser.first_name || '')
        if (freshUser.profile) {
          setTimezone(freshUser.profile.timezone)
          setDigestTime(freshUser.profile.digest_time.slice(0, 5))
          setDeliveryChannel(freshUser.profile.delivery_channel)
          setTelegramChatId(freshUser.profile.telegram_chat_id || '')
          setJobHuntMode(freshUser.profile.job_hunt_mode)
          setDigestEnabled(freshUser.profile.digest_enabled)
        }
      })
      .catch((err) => {
        console.warn('Unable to load fresh profile:', err)
      })
      .finally(() => {
        setIsLoadingProfile(false)
      })
  }, [isAuthenticated, setUser])

  const quickChips = [
    { label: '6:00 AM', value: '06:00' },
    { label: '7:00 AM', value: '07:00' },
    { label: '8:00 AM', value: '08:00' },
  ]

  const filteredTimezones = ALL_TIMEZONES.filter((tz) =>
    tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    tz.value.toLowerCase().includes(tzSearch.toLowerCase())
  )

  const handleSavePreferences = async () => {
    setIsSaving(true)
    try {
      const updatedUser = await authApi.updatePreferences({
        name: name.trim(),
        timezone,
        digest_time: digestTime,
        delivery_channel: deliveryChannel,
        telegram_chat_id: telegramChatId || null,
        job_hunt_mode: jobHuntMode,
        digest_enabled: digestEnabled,
      })

      setUser(updatedUser)
      addToast({
        type: 'success',
        title: 'Preferences Saved',
        description: 'Your morning briefing schedule and channels have been updated.',
      })
    } catch (err: any) {
      console.error('Save error:', err)
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.response?.data?.detail || 'Unable to update preferences. Please check inputs.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTestBrief = async () => {
    setIsSendingTestBrief(true)
    try {
      const res = await digestApi.sendTestBrief()
      addToast({
        type: 'success',
        title: 'Test Brief Dispatched',
        description: res.message || `Briefing email sent to ${user?.email}`,
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delivery Failed',
        description: err.response?.data?.error || 'Unable to dispatch test brief.',
      })
    } finally {
      setIsSendingTestBrief(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return

    setIsDeleting(true)
    try {
      await authApi.deleteAccount()
      logout()
      setIsDeleteModalOpen(false)
      addToast({
        type: 'warning',
        title: 'Account Deleted',
        description: 'Your account and all associated briefing history have been permanently removed.',
      })
      navigate('/register')
    } catch (err: any) {
      console.error('Delete error:', err)
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        description: 'Unable to complete account deletion. Please try again.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-80 h-4" />
        </div>
        <div className="p-6 bg-white rounded-xl border border-zinc-200 space-y-4">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-12" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900 tracking-tight">
            Settings & Preferences
          </h1>
          <Badge variant="indigo" size="md">
            Profile Config
          </Badge>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Adjust schedule timing, delivery endpoints, and AI prioritization parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Subnav (Profile, Schedule, Delivery, Priority, Danger) */}
        <div className="md:col-span-3 sticky top-24 space-y-1 hidden md:block">
          <a
            href="#profile"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200/70 transition-colors"
          >
            <Shield className="w-4 h-4 text-zinc-500" />
            <span>Profile Details</span>
          </a>
          <a
            href="#schedule"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <Clock className="w-4 h-4 text-zinc-500" />
            <span>Schedule & Timing</span>
          </a>
          <a
            href="#delivery"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <Mail className="w-4 h-4 text-zinc-500" />
            <span>Delivery Channels</span>
          </a>
          <a
            href="#priority"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <Briefcase className="w-4 h-4 text-zinc-500" />
            <span>AI Prioritization</span>
          </a>
          <a
            href="#danger"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Danger Zone</span>
          </a>
        </div>

        {/* Right Content Cards */}
        <div className="md:col-span-9 space-y-6">
          {/* Profile Card */}
          <div id="profile">
            <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Your personal account identification</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
              />
              <Input
                label="Registered Email"
                value={user?.email || ''}
                disabled
                helperText="Primary email cannot be changed"
              />
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Schedule & Timing Card */}
          <div id="schedule">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Delivery Schedule</CardTitle>
                    <CardDescription>
                      Determine your wake-up time and local timezone for compilation.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
                    Digest Dispatch Time
                  </label>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {quickChips.map((chip) => (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => setDigestTime(chip.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${digestTime === chip.value
                            ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
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

                {/* Searchable Timezone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Local Timezone
                    </label>
                    <span className="text-xs font-mono text-primary font-semibold">
                      Active: {timezone}
                    </span>
                  </div>

                  <Input
                    placeholder="Search timezones (e.g. Kolkata, London, New York)..."
                    value={tzSearch}
                    onChange={(e) => setTzSearch(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />

                  <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-white">
                    {filteredTimezones.map((tz) => (
                      <div
                        key={tz.value}
                        onClick={() => setTimezone(tz.value)}
                        className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${timezone === tz.value
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'hover:bg-zinc-50 text-zinc-700'
                          }`}
                      >
                        <span>{tz.label}</span>
                        {timezone === tz.value && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Channel Toggles Card */}
          <div id="delivery">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Delivery Endpoints</CardTitle>
                    <CardDescription>
                      Configure active channels for dispatching digests.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setDeliveryChannel('email')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryChannel === 'email' || deliveryChannel === 'both'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">Email Delivery</h4>
                        <p className="text-xs text-zinc-500">Sent to {user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setDeliveryChannel(deliveryChannel === 'email' ? 'both' : 'email')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryChannel === 'telegram' || deliveryChannel === 'both'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Send className="w-5 h-5 text-sky-600" />
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900">Telegram Bot</h4>
                          <p className="text-xs text-zinc-500">Bot messaging</p>
                        </div>
                      </div>
                      <Badge variant="amber" size="sm">Phase 7</Badge>
                    </div>
                  </div>
                </div>

                {(deliveryChannel === 'telegram' || deliveryChannel === 'both') && (
                  <Input
                    label="Telegram Chat ID"
                    placeholder="e.g. 123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    helperText="Send /start to @MorningBriefBot to link your ID"
                  />
                )}

                {/* Test Email Preview Action */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-zinc-900">Email Digest Preview</h5>
                      <p className="text-[11px] text-zinc-500">
                        Dispatch today's synthesized briefing to <span className="font-mono text-zinc-700">{user?.email}</span> immediately.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isSendingTestBrief}
                    onClick={handleSendTestBrief}
                    leftIcon={<Send className="w-3.5 h-3.5 text-primary" />}
                  >
                    Send me a test brief
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Prioritization */}
          <div id="priority">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>AI Ranking Intelligence</CardTitle>
                    <CardDescription>Fine-tune how the ranking model orders morning feeds.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Switch
                  label="Job Hunt Mode"
                  description="Automatically elevate recruiter inquiries, interview schedules, and application replies to Rank #1 Critical priority."
                  checked={jobHuntMode}
                  onChange={setJobHuntMode}
                />

                <div className="pt-3 border-t border-zinc-100">
                  <Switch
                    label="Enable Daily Briefings"
                    description="Automatically generate and dispatch your briefing at your designated time."
                    checked={digestEnabled}
                    onChange={setDigestEnabled}
                  />
                </div>
              </CardContent>

              <CardFooter>
                <span className="text-xs text-zinc-500">
                  Changes update immediately in your profile
                </span>
                <Button
                  variant="primary"
                  isLoading={isSaving}
                  onClick={handleSavePreferences}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Danger Zone Card */}
          <div id="danger">
            <Card className="border-rose-200 bg-rose-50/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-rose-900">Danger Zone</CardTitle>
                    <CardDescription className="text-rose-700">
                      Irreversible account actions and data purging
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900">
                      Delete Account & All Ingested Data
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5 max-w-md">
                      Permanently delete your user profile, stored credentials, digest history, and feedback records. This cannot be undone.
                    </p>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsDeleteModalOpen(true)}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeleteConfirmText('')
        }}
        title="Delete MorningBrief Account"
        description="This action is irreversible. All your connected tokens and history will be permanently erased."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed">
            Please type <strong className="font-mono text-rose-900 font-bold">DELETE</strong> below to confirm deletion of your account (<span className="font-mono">{user?.email}</span>).
          </div>

          <Input
            placeholder="Type DELETE to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setDeleteConfirmText('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              isLoading={isDeleting}
              onClick={handleDeleteAccount}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Account Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
