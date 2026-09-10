import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sun, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Button, Input, Card } from '../components/ui'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import { authApi } from '../api/auth'

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
      const tokens = await authApi.login({ email, password })
      useAuthStore.getState().setTokens(tokens)

      // 2. Fetch authenticated user + profile
      const user = await authApi.getMe()
      setAuth(user, tokens)

      addToast({
        type: 'success',
        title: 'Welcome Back',
        description: `Signed in as ${user.name || user.email}`,
      })

      // 3. Route to onboarding if not completed, otherwise to today
      if (!user.profile?.completed_at) {
        navigate('/onboarding')
      } else {
        navigate('/today')
      }
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Mark & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white shadow-md mb-3">
            <Sun className="w-6 h-6 text-amber-50" />
          </div>
          <h1 className="font-display font-bold text-2xl text-zinc-900 tracking-tight">
            Sign in to MorningBrief
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            Your daily brief, automatically
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose text-xs font-medium leading-relaxed">
                {error}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="alex@morningbrief.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              autoComplete="current-password"
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-100 text-center text-xs text-zinc-500">
            <span>New to MorningBrief? </span>
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
