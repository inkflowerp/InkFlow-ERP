'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Shield,
  Lock,
  Mail,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  ChevronLeft,
  ArrowRight,
  Database,
  Server,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { LanguageSwitcher } from '@/components/shell/language-switcher'
import { useI18n } from '@/lib/i18n'
import { platformLoginAction } from '@/actions/platform-auth.actions'

// --- InkFlow Vector Logo ---
function InkFlowPlatformLogo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 select-none group cursor-pointer ${className}`}>
      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
        <Server className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-lg sm:text-xl font-black tracking-tight text-foreground leading-none">
            InkFlow
          </span>
          <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
            PLATFORM
          </span>
        </div>
        <div className="text-2xs tracking-[0.25em] font-bold text-muted-foreground uppercase mt-0.5 leading-none">
          CONTROL CENTER
        </div>
      </div>
    </Link>
  )
}

function PlatformLoginForm() {
  const { tBilingual } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [requiresMfa, setRequiresMfa] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const errParam = searchParams.get('error')
    if (errParam === 'unauthorized') {
      setError(tBilingual('You do not have access to the owner panel.', 'আপনার এই প্যানেলে প্রবেশের অনুমতি নেই।'))
    } else if (errParam === 'disabled') {
      setError(tBilingual('This account has been stopped. Contact support.', 'এই অ্যাকাউন্ট বন্ধ করা হয়েছে। সাপোর্টে কথা বলুন।'))
    }
  }, [searchParams, tBilingual])

  const executeSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    setError(null)
    setIsNetworkError(false)

    const redirectTo = searchParams.get('redirectTo') || '/platform'
    const formData = new FormData()
    formData.append('email', email.trim())
    formData.append('password', password)
    formData.append('redirectTo', redirectTo)
    if (mfaCode) {
      formData.append('mfaCode', mfaCode.trim())
    }

    try {
      const res = await platformLoginAction(formData)

      if (res.success && res.redirectUrl) {
        window.location.href = res.redirectUrl
      } else if (res.requiresMfa || res.mfaRequired) {
        setRequiresMfa(true)
        setError(res.error || null)
      } else {
        setError(res.error || tBilingual('Wrong email or password. Please try again.', 'ভুল ইমেইল বা পাসওয়ার্ড। আবার চেষ্টা করুন।'))
      }
    } catch (err: any) {
      if (!navigator.onLine || err?.message?.includes('network') || err?.message?.includes('fetch')) {
        setIsNetworkError(true)
        setError(tBilingual('Internet problem. Check connection and try again.', 'ইন্টারনেট সমস্যা। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'))
      } else {
        setError(err?.message || tBilingual('Could not sign in. Please try again.', 'সাইন ইন করা যায়নি। আবার চেষ্টা করুন।'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-primary selection:text-primary-foreground">
      {/* --- Top Navigation Bar --- */}
      <header className="relative z-30 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-2 flex items-center justify-between shrink-0">
        <div>
          <InkFlowPlatformLogo />
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Status Indicator */}
          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border text-2xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span>{tBilingual('System Active', 'সিস্টেম সচল')}</span>
          </div>

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle size="sm" />

          {/* Language Switcher */}
          <LanguageSwitcher size="sm" />
        </div>
      </header>

      {/* --- Main Content Container --- */}
      <main className="relative z-20 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-6 lg:gap-10 my-auto min-h-0">
        {/* LEFT COLUMN: Highlights (Desktop Only) */}
        <div className="hidden lg:flex w-full max-w-md xl:max-w-lg flex-col justify-center space-y-4">
          <div>
            <div className="text-2xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-1">
              {tBilingual('PLATFORM OWNER', 'প্ল্যাটফর্ম মালিক')}
            </div>
            <div className="w-8 h-1 rounded-full bg-primary" />
          </div>

          {/* Main Headline */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-foreground leading-[1.15]">
              {tBilingual('Operate InkFlow.', 'ইঙ্কফ্লো পরিচালনা করুন।')}
              <br />
              <span className="text-primary">
                {tBilingual('Securely.', 'সম্পূর্ণ নিরাপদে।')}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
              {tBilingual(
                'Manage the InkFlow platform, clients, users, and system from one secure control center.',
                'একটি নিরাপদ কন্ট্রোল সেন্টার থেকে ইঙ্কফ্লো প্ল্যাটফর্ম, ক্লায়েন্ট ও সিস্টেম পরিচালনা করুন।'
              )}
            </p>
          </div>

          {/* 3 Value Points */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs xl:text-sm font-bold text-foreground">
                  {tBilingual('Owner access', 'মালিকের একাউন্ট')}
                </div>
                <div className="text-2xs xl:text-xs text-muted-foreground leading-normal">
                  {tBilingual('Built for authorized staff only.', 'শুধুমাত্র অনুমোদিত কর্মীদের জন্য।')}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Database className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs xl:text-sm font-bold text-foreground">
                  {tBilingual('Separate clients', 'আলাদা ক্লায়েন্ট')}
                </div>
                <div className="text-2xs xl:text-xs text-muted-foreground leading-normal">
                  {tBilingual('Keep every business separate and secure.', 'প্রতিটি ক্লায়েন্ট আলাদা ও নিরাপদ থাকে।')}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-lg bg-success-surface border border-success/30 flex items-center justify-center text-success shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-success" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs xl:text-sm font-bold text-foreground">
                  {tBilingual('Safe and secure', 'নিরাপদ লগইন')}
                </div>
                <div className="text-2xs xl:text-xs text-muted-foreground leading-normal">
                  {tBilingual('Your data and actions are always protected.', 'আপনার তথ্য সর্বদা সুরক্ষিত থাকে।')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sign In Card */}
        <div className="w-full max-w-sm sm:max-w-md flex justify-center">
          <div className="w-full bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs relative z-20">
            {/* Card Header */}
            <div className="text-center space-y-1 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-card border border-primary/20 text-primary shadow-xs mb-1">
                <Shield className="w-5 h-5 text-primary" />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight">
                  {tBilingual('Platform Owner', 'প্ল্যাটফর্ম মালিক')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {requiresMfa
                    ? tBilingual('Enter the 6-digit code.', '৬-সংখ্যার কোড লিখুন।')
                    : tBilingual('Sign in to control center.', 'কন্ট্রোল সেন্টারে সাইন ইন করুন।')}
                </p>
                <p className="text-2xs text-muted-foreground">
                  {tBilingual('Authorized staff only.', 'শুধুমাত্র অনুমোদিত কর্মীরা।')}
                </p>
              </div>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="mb-3 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive border border-destructive/30 flex items-start gap-2 animate-in fade-in-50 duration-150">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{error}</span>
                  {isNetworkError && (
                    <div className="mt-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => executeSignIn()}
                        className="text-2xs h-6 border-destructive/30 bg-destructive/10 text-foreground hover:bg-destructive/90 px-2"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {tBilingual('Try Again', 'আবার চেষ্টা')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={executeSignIn} noValidate className="space-y-3">
              {requiresMfa ? (
                /* MFA Mode */
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate text-xs">
                      {tBilingual('Signing in:', 'লগইন হচ্ছে:')} <strong className="text-foreground tabular-nums">{email}</strong>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="platform-mfa" className="text-2xs font-bold tracking-wider text-muted-foreground uppercase">
                      {tBilingual('6-DIGIT CODE', '৬-সংখ্যার কোড')}
                    </Label>
                    <input
                      id="platform-mfa"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      required
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 tabular-nums tracking-widest text-center text-base sm:text-lg h-10 rounded-xl outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRequiresMfa(false)
                        setError(null)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 min-h-8 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>{tBilingual('Back', 'পেছনে')}</span>
                    </button>

                    <Button
                      type="submit"
                      disabled={isLoading || mfaCode.length !== 6}
                      className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl"
                    >
                      {isLoading ? tBilingual('Verifying...', 'যাচাই হচ্ছে...') : tBilingual('Verify & Sign In', 'যাচাই করে প্রবেশ')}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Credentials Mode */
                <>
                  {/* Email Field */}
                  <div className="space-y-1">
                    <Label
                      htmlFor="platform-email"
                      className="text-2xs font-bold tracking-wider text-muted-foreground uppercase"
                    >
                      {tBilingual('Email, Username or Mobile', 'ইমেইল, ইউজারনেম বা মোবাইল')}
                    </Label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 pointer-events-none text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="platform-email"
                        type="text"
                        required
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={tBilingual('admin@inkflow.com.bd, 017...', 'ইমেইল বা ০১...')}
                        className="w-full bg-background border border-border hover:border-input focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl pl-9 pr-3 h-10 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <Label
                      htmlFor="platform-password"
                      className="text-2xs font-bold tracking-wider text-muted-foreground uppercase"
                    >
                      {tBilingual('Password', 'পাসওয়ার্ড')}
                    </Label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 pointer-events-none text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="platform-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={tBilingual('Enter your password', 'পাসওয়ার্ড লিখুন')}
                        className="w-full bg-background border border-border hover:border-input focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl pl-9 pr-9 h-10 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password */}
                  <div className="flex justify-end pt-0.5">
                    <Link
                      href="/platform/forgot-password"
                      className="text-2xs text-primary hover:text-primary/80 font-medium transition-colors hover:underline"
                    >
                      {tBilingual('Forgot password?', 'পাসওয়ার্ড ভুলে গেছেন?')}
                    </Link>
                  </div>

                  {/* Sign In Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-10 min-h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>{tBilingual('Signing in...', 'সাইন ইন হচ্ছে...')}</span>
                        </>
                      ) : (
                        <>
                          <span>{tBilingual('Sign In', 'লগইন করুন')}</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center py-0.5">
                    <div className="w-full border-t border-border" />
                    <span className="bg-card px-2 text-2xs font-bold tracking-wider text-muted-foreground uppercase">
                      {tBilingual('OR', 'অথবা')}
                    </span>
                    <div className="w-full border-t border-border" />
                  </div>

                  {/* Business Login Alternative */}
                  <div className="text-center text-2xs text-muted-foreground">
                    {tBilingual('Looking for your printing shop ERP?', 'আপনার নিজস্ব শপ ERP খুঁজছেন?')}{' '}
                    <Link
                      href="/login"
                      className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>{tBilingual('Shop Login', 'শপ লগইন')}</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>

                  {/* Security Badge */}
                  <div className="mt-2.5 p-2 rounded-xl bg-muted/60 border border-border text-2xs text-muted-foreground flex items-center gap-2">
                    <div className="w-4 h-4 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Shield className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <span className="leading-tight text-2xs">
                      {tBilingual(
                        'Secure session with encrypted authentication.',
                        'এনক্রিপ্টেড ও সম্পূর্ণ নিরাপদ লগইন।'
                      )}
                    </span>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* --- Footer Area --- */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-2xs text-muted-foreground border-t border-border shrink-0">
        <div className="tracking-[0.2em] font-semibold uppercase text-muted-foreground flex items-center gap-1.5 text-2xs">
          <span>PRINT</span>
          <span className="text-primary font-normal">›</span>
          <span>PEOPLE</span>
          <span className="text-primary font-normal">›</span>
          <span>PROCESS</span>
          <span className="text-primary font-normal">›</span>
          <span>PROFIT</span>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {tBilingual('Privacy', 'প্রাইভেসি')}
          </Link>
          <span>|</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {tBilingual('Terms', 'শর্তাবলী')}
          </Link>
          <span>|</span>
          <Link href="/platform/support" className="hover:text-foreground transition-colors">
            {tBilingual('Support', 'সাপোর্ট')}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default function PlatformLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
          Loading platform console...
        </div>
      }
    >
      <PlatformLoginForm />
    </Suspense>
  )
}
