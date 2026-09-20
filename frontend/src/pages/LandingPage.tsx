import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sun,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Mail,
  Github,
  Calendar,
  Send,
  Rss,
  CheckCircle2,
  Cpu,
  Layers,
  Zap,
  Lock,
  ChevronRight,
} from 'lucide-react'
import { Button } from '../components/ui'

export const LandingPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 selection:bg-zinc-900 selection:text-white flex flex-col relative overflow-x-hidden">
      {/* Ambient Canvas Mesh Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] sm:w-[800px] h-[300px] sm:h-[500px] bg-gradient-to-b from-indigo-500/10 via-amber-500/5 to-transparent rounded-full blur-[70px] sm:blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-[-100px] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-500/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none -z-10" />

      {/* ========================================================= */}
      {/* 1. TOP NAVIGATION BAR                                     */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-[#FCFCF9]/90 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-zinc-200/80 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <img src="/logo.png" alt="MorningBrief Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-[16px] sm:text-[18px] tracking-tight text-zinc-900 leading-none">
                MorningBrief
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase text-zinc-500 mt-1">
                Executive Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-zinc-600">
            <a href="#features" className="hover:text-zinc-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-zinc-900 transition-colors">
              How It Works
            </a>
            <a href="#integrations" className="hover:text-zinc-900 transition-colors">
              Integrations
            </a>
            <a href="#security" className="hover:text-zinc-900 transition-colors">
              Security
            </a>
          </nav>

          {/* Right Action & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="hidden sm:inline-block">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl px-3 sm:px-4 text-[13px] font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
              >
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl px-3.5 sm:px-5 h-8 sm:h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] sm:text-[13px] font-semibold shadow-sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Get Started
              </Button>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors ml-1"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <Lock className="w-5 h-5 text-zinc-900" />
              ) : (
                <Layers className="w-5 h-5 text-zinc-900" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#FCFCF9] border-b border-zinc-200/80 px-4 pt-3 pb-5 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-2 text-[14px] font-medium text-zinc-700">
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#integrations"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                Integrations
              </a>
              <a
                href="#security"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                Security
              </a>
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors font-semibold text-zinc-900"
              >
                Sign In
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-[12px] font-semibold tracking-wide mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Executive Intelligence Command Center • V2.0</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-display text-[40px] sm:text-[58px] lg:text-[68px] font-bold text-zinc-900 tracking-tight leading-[1.06] max-w-4xl mx-auto">
          Your mornings, summarized before you wake up.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-[16px] sm:text-[19px] text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          Replace 50 noisy tabs, unread newsletters, and endless pull requests with a single, ranked daily intelligence briefing compiled by AI and delivered at 7:00 AM.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-semibold shadow-md flex items-center justify-center gap-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start Free Today
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-7 rounded-xl border-zinc-300 text-zinc-800 hover:bg-zinc-100 text-[15px] font-semibold bg-white"
            >
              Sign In to Command Center
            </Button>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[12.5px] font-medium text-zinc-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>100% Free to Start</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Fernet-256 Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>3-Minute Daily Read</span>
          </div>
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-600" />
            <span>Email & Telegram Dispatch</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. INTERACTIVE BRIEFING PREVIEW CARD                      */}
      {/* ========================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-24">
        <div className="relative rounded-[28px] p-2 sm:p-3 bg-gradient-to-b from-zinc-200/80 to-zinc-300/40 shadow-2xl border border-zinc-200/80">
          <div className="bg-white rounded-[22px] border border-zinc-200/90 shadow-sm overflow-hidden">
            {/* Briefing Card Header */}
            <div className="bg-[#0F0F0F] text-white px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                  <Sun className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold tracking-tight text-white">
                    Executive Briefing Dispatch
                  </h2>
                  <p className="text-[12px] text-zinc-400">
                    Compiled automatically for Alex Rivera • 07:00 AM IST
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  DELIVERED
                </span>
                <span className="text-[12px] font-mono text-zinc-400">
                  LLM Cost: $0.003
                </span>
              </div>
            </div>

            {/* Briefing Card Body */}
            <div className="p-6 sm:p-8 space-y-6 bg-white">
              {/* Item 1: Urgent Action */}
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/40 border border-rose-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
                  <Github className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                      Urgent Review
                    </span>
                    <span className="text-[12px] text-zinc-400 font-mono">06:45 AM</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-900 mt-1">
                    PR #84: Critical Security & Authentication Hotfix
                  </h3>
                  <p className="text-[13px] text-zinc-600 mt-1 leading-normal">
                    Assigned to you by Lead Architect. Passes all 25 unit tests; needs your approval before staging deployment.
                  </p>
                </div>
              </div>

              {/* Item 2: Calendar & Agenda */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      Today's Agenda
                    </span>
                    <span className="text-[12px] text-zinc-400 font-mono">10:00 AM - 10:45 AM</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-900 mt-1">
                    Q3 Product Roadmap & Infrastructure Sync
                  </h3>
                  <p className="text-[13px] text-zinc-600 mt-1 leading-normal">
                    Google Calendar sync • 4 attendees confirmed. Discussion on Neon Postgres migration and LLM latency.
                  </p>
                </div>
              </div>

              {/* Item 3: Curated Intelligence */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <Rss className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      High-Signal Tech
                    </span>
                    <span className="text-[12px] text-zinc-400 font-mono">Hacker News</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-900 mt-1">
                    Python 3.14 Released with Experimental JIT Compiler
                  </h3>
                  <p className="text-[13px] text-zinc-600 mt-1 leading-normal">
                    Standard library performance boosted by 28%. Major ecosystem packages announce zero-day compatibility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. CORE PILLARS & FEATURES                                */}
      {/* ========================================================= */}
      <section id="features" className="py-20 bg-white border-y border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[12px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Intelligence Architecture
            </span>
            <h2 className="font-display text-[32px] sm:text-[44px] font-bold text-zinc-900 tracking-tight mt-4">
              Engineered to eliminate cognitive overload
            </h2>
            <p className="text-[16px] text-zinc-600 mt-3">
              We process hundreds of raw items across all your channels, filter out the noise, and present only what demands your attention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] hover:border-zinc-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-zinc-900">Multi-Source Ingestion</h3>
              <p className="text-[13.5px] text-zinc-600 mt-2 leading-relaxed">
                Connect Gmail, Google Calendar, GitHub, and your favorite RSS feeds into a unified pipeline.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] hover:border-zinc-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-5">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-zinc-900">AI Distillation</h3>
              <p className="text-[13.5px] text-zinc-600 mt-2 leading-relaxed">
                Advanced LLM models synthesize raw text into concise executive summaries with deterministic SHA-256 deduplication.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] hover:border-zinc-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-5">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-zinc-900">Dual-Channel Delivery</h3>
              <p className="text-[13.5px] text-zinc-600 mt-2 leading-relaxed">
                Receive clean editorial digests directly in your email inbox or as real-time push alerts on your Telegram bot.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] hover:border-zinc-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-zinc-900">Zero-Compromise Security</h3>
              <p className="text-[13.5px] text-zinc-600 mt-2 leading-relaxed">
                Tokens and credentials stored using cryptographic Fernet-256 encryption. Read-only access scopes guaranteed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. HOW IT WORKS (3 STEPS)                                 */}
      {/* ========================================================= */}
      <section id="how-it-works" className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[12px] font-bold tracking-wider uppercase text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">
            Simple Workflow
          </span>
          <h2 className="font-display text-[32px] sm:text-[44px] font-bold text-zinc-900 tracking-tight mt-4">
            How MorningBrief delivers clarity
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-7 border border-zinc-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white font-bold text-[15px] flex items-center justify-center mb-5">
              1
            </div>
            <h3 className="text-[18px] font-bold text-zinc-900">Connect Your Sources</h3>
            <p className="text-[14px] text-zinc-600 mt-2 leading-relaxed">
              Link your Gmail, Google Calendar, GitHub repository notifications, and RSS feeds in 60 seconds with OAuth.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-7 border border-zinc-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-[15px] flex items-center justify-center mb-5">
              2
            </div>
            <h3 className="text-[18px] font-bold text-zinc-900">AI Synthesizes at 7:00 AM</h3>
            <p className="text-[14px] text-zinc-600 mt-2 leading-relaxed">
              While you are asleep, our background pipeline ingests thousands of lines, deduplicates them, and extracts top priorities.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-7 border border-zinc-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold text-[15px] flex items-center justify-center mb-5">
              3
            </div>
            <h3 className="text-[18px] font-bold text-zinc-900">Read in 3 Minutes</h3>
            <p className="text-[14px] text-zinc-600 mt-2 leading-relaxed">
              Wake up to an editorial briefing on your phone or computer. Know exactly what matters before your first meeting starts.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. SUPPORTED INTEGRATIONS                                 */}
      {/* ========================================================= */}
      <section id="integrations" className="py-20 bg-white border-t border-zinc-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[12px] font-bold tracking-wider uppercase text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">
            Native Connectors
          </span>
          <h2 className="font-display text-[32px] sm:text-[40px] font-bold text-zinc-900 tracking-tight mt-4">
            Connects to your essential workspace tools
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-12">
            <div className="p-5 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] flex flex-col items-center gap-3">
              <Mail className="w-7 h-7 text-rose-600" />
              <span className="text-[13px] font-semibold text-zinc-800">Gmail</span>
            </div>
            <div className="p-5 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] flex flex-col items-center gap-3">
              <Calendar className="w-7 h-7 text-blue-600" />
              <span className="text-[13px] font-semibold text-zinc-800">Google Calendar</span>
            </div>
            <div className="p-5 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] flex flex-col items-center gap-3">
              <Github className="w-7 h-7 text-zinc-900" />
              <span className="text-[13px] font-semibold text-zinc-800">GitHub</span>
            </div>
            <div className="p-5 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] flex flex-col items-center gap-3">
              <Send className="w-7 h-7 text-sky-600" />
              <span className="text-[13px] font-semibold text-zinc-800">Telegram Bot</span>
            </div>
            <div className="p-5 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] flex flex-col items-center gap-3">
              <Zap className="w-7 h-7 text-amber-600" />
              <span className="text-[13px] font-semibold text-zinc-800">Hacker News</span>
            </div>
            <div className="p-5 rounded-2xl border border-zinc-200/80 bg-[#FCFCF9] flex flex-col items-center gap-3">
              <Rss className="w-7 h-7 text-indigo-600" />
              <span className="text-[13px] font-semibold text-zinc-800">Custom RSS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. BOTTOM CALL TO ACTION                                  */}
      {/* ========================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="bg-[#0F0F0F] rounded-[32px] text-white p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl border border-zinc-800">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-500/20 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="font-display text-[32px] sm:text-[46px] font-bold tracking-tight text-white leading-tight">
              Start your mornings with clarity tomorrow.
            </h2>
            <p className="text-[15px] sm:text-[17px] text-zinc-400 leading-relaxed">
              Create your account in 60 seconds. Connect your inboxes, choose your delivery channel, and let AI prepare your morning briefing.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 text-[15px] font-semibold shadow-md"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Create Free Account
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto h-12 px-7 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 text-[15px] font-semibold"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FOOTER                                                 */}
      {/* ========================================================= */}
      <footer className="border-t border-zinc-200/80 py-10 bg-white text-zinc-500 text-[13px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-zinc-200">
              <img src="/logo.png" alt="MorningBrief Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-semibold text-zinc-900">MorningBrief</span>
            <span className="text-zinc-400">© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-zinc-600">
            <Link to="/login" className="hover:text-zinc-900 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-zinc-900 transition-colors">
              Create Account
            </Link>
            <a href="#security" className="hover:text-zinc-900 transition-colors">
              Security
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
