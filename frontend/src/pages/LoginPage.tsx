import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Sun,
  Mail,
  Lock,
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
import { connectionsApi } from '../api/connections'

export const LoginPage: React.FC = () => {
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
      // 1. Real API login
      const tokens = await authApi.login({ email: email.trim(), password })
      useAuthStore.getState().setTokens(tokens)

      // 2. Fetch authenticated user + profile
      const user = await authApi.getMe()
      setAuth(user, tokens)

      addToast({
        type: 'success',
        title: 'Welcome Back',
        description: `Signed in as ${user.name || user.email}`,
      })

      // 3. Route to connections panel screen (onboarding step 4)
      navigate('/onboarding?step=4')
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait 60 seconds before trying again.')
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Invalid email or password. Please check your credentials.')
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
            Your mornings, summarized.
          </h1>

          <p className="text-zinc-400 text-base leading-relaxed">
            Replace dozens of noisy tabs, newsletters, and pull requests with a single, ranked daily briefing compiled automatically by LLM intelligence.
          </p>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Hacker News, RSS feeds, GitHub notifications, and Gmail inbox</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Deterministic deduplication with SHA-256 and LLM executive ranking</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated 7:00 AM delivery via email and Telegram bot</span>
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
                Welcome back
              </h2>
              <p className="text-zinc-500 text-[13.5px] mt-1.5">
                Sign in to access your morning intelligence briefing.
              </p>
            </div>

            {/* Google Sign In Button */}
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    setIsLoading(true)
                    const data = await connectionsApi.getGmailAuthUrl()
                    if (data?.url || data?.auth_url) {
                      window.location.href = data.url || data.auth_url
                    }
                  } catch {
                    setError('Failed to initiate Google sign-in. Please try again.')
                    setIsLoading(false)
                  }
                }}
                className="w-full h-11 text-[13.5px] font-semibold border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 shadow-xs flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[12px] text-zinc-400 font-medium">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="border border-rose-300 bg-rose-50/50 text-[12.5px] text-rose-600 rounded-xl p-3 leading-relaxed">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold uppercase tracking-wider text-zinc-600">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="alex@morningbrief.dev"
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
                    placeholder="Enter your password"
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
                    autoComplete="current-password"
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
                  Sign In to Briefing
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
              <span>New to MorningBrief? </span>
              <Link
                to="/register"
                className="text-zinc-900 font-semibold hover:underline transition-colors"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
