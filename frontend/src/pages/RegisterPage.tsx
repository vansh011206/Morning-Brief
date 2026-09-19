import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Sun,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import { authApi } from '../api/auth'

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { setAuth } = useAuthStore()
  const { addToast } = useToastStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // 1. Register with real API
      const res = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
      })

      // 2. Save auth state (tokens + user)
      setAuth(res.user, res.tokens)

      addToast({
        type: 'success',
        title: 'Account Created',
        description: 'Welcome to MorningBrief. Next, let us configure your daily briefing.',
      })

      // 3. Navigate directly into Onboarding wizard
      navigate('/onboarding')
    } catch (err: any) {
      console.error('Registration error:', err)
      if (err.response?.data?.email) {
        setError(Array.isArray(err.response.data.email) ? err.response.data.email[0] : err.response.data.email)
      } else if (err.response?.data?.password) {
        setError(Array.isArray(err.response.data.password) ? err.response.data.password[0] : err.response.data.password)
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Failed to create account. Please check your details and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-screen flex overflow-hidden">
      {/* ========================================================= */}
      {/* LEFT 50%: Dark Executive Panel (#0F0F0F)                  */}
      {/* ========================================================= */}
      <div className="hidden lg:flex w-1/2 h-screen bg-[#0F0F0F] text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden select-none border-r border-zinc-800">
        {/* Ambient mesh blobs in dark panel */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Sun className="w-5 h-5 text-amber-400" strokeWidth={1.75} />
          </div>
          <span className="font-display font-bold text-[18px] text-white tracking-tight">
            MorningBrief
          </span>
        </div>

        {/* Center Editorial Statement */}
        <div className="space-y-6 relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Executive Intelligence Command Center</span>
          </div>

          <h1 className="font-display font-bold text-[44px] xl:text-[52px] text-white tracking-tight leading-[1.08]">
            Start your mornings with clarity.
          </h1>

          <p className="text-zinc-400 text-base leading-relaxed">
            Create an account to unify your RSS feeds, engineering alerts, and communications into an executive morning briefing delivered at 7:00 AM.
          </p>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full privacy: Fernet encrypted source credentials</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Job hunt mode for recruiter priority boost</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Telegram bot and email morning deliveries</span>
            </div>
          </div>
        </div>

        {/* Bottom Trust Row */}
        <div className="flex items-center gap-6 text-xs text-zinc-500 relative z-10 pt-6 border-t border-zinc-800/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Fernet-256 Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>7:00 AM Local Delivery</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT 50%: Warm Paper Canvas Form (#FCFCF9)              */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 h-screen overflow-y-auto bg-[#FCFCF9] flex items-center justify-center p-6 sm:p-12 relative">
        {/* Ambient mesh blob */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-[420px] space-y-6 relative z-10">
          {/* Mobile Logo Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Sun className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <span className="font-display font-bold text-xl text-zinc-900 tracking-tight">
              MorningBrief
            </span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-[24px] border border-zinc-200/80 shadow-lg p-8 sm:p-10 space-y-6">
            <div>
              <h2 className="font-display font-bold text-[26px] text-zinc-900 tracking-tight leading-tight">
                Create your account
              </h2>
              <p className="text-zinc-500 text-[13.5px] mt-1.5">
                Set up your executive briefing dashboard in 60 seconds.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="border border-rose-300 bg-rose-50/50 text-[12.5px] text-rose-600 rounded-xl p-3 leading-relaxed">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold uppercase tracking-wider text-zinc-600">
                  Your Full Name
                </label>
                <Input
                  type="text"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<UserIcon className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold uppercase tracking-wider text-zinc-600">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold uppercase tracking-wider text-zinc-600">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="rounded-full hover:bg-zinc-100 p-1.5 transition-colors text-zinc-400 hover:text-zinc-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                        ) : (
                          <Eye className="w-4 h-4" strokeWidth={1.75} />
                        )}
                      </button>
                    }
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-12 text-[14px] font-semibold"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
                >
                  Get Started
                </Button>
              </div>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[12px] text-zinc-400 font-medium">or</span>
              </div>
            </div>

            <div className="text-center text-[13px] text-zinc-500">
              <span>Already have an account? </span>
              <Link
                to="/login"
                className="text-zinc-900 font-semibold hover:underline transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
