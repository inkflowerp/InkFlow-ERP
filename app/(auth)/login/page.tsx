'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { loginSchema, LoginFormData } from '@/features/auth/auth.schemas'
import { signInAction, signInWithGoogleAction } from '@/actions/auth.actions'
import { GoogleOAuthProvider } from '@/lib/auth/auth-providers'
import { resolveHostname } from '@/lib/tenant/tenant-resolution'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

const SAVED_EMAIL_STORAGE_KEY = 'printerp_remembered_email'

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPlatformAdminError, setIsPlatformAdminError] = useState(false)
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isCapsLock, setIsCapsLock] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const currentEmail = watch('email')
  const currentPassword = watch('password')

  // Load remembered email and handle search param feedback
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(SAVED_EMAIL_STORAGE_KEY)
      if (savedEmail) {
        setValue('email', savedEmail)
        setRememberMe(true)
      }
    } catch {
      // Non-blocking
    }

    const errParam = searchParams.get('error')
    const errDescParam = searchParams.get('error_description')
    const loggedOutParam = searchParams.get('logged_out')

    if (errParam === 'disabled') {
      setError(
        locale === 'bn'
          ? 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। অনুগ্রহ করে আপনার প্রতিষ্ঠানের অ্যাডমিনিস্ট্রেটরের সাথে যোগাযোগ করুন।'
          : 'Your account has been disabled by your administrator. Row Level Security has revoked all access to company records.'
      )
    } else if (errParam === 'unauthorized_google' || errParam === 'unauthorized_tenant') {
      setError(
        locale === 'bn'
          ? 'এই গুগল অ্যাকাউন্টটির সাথে কোনো অনুমোদিত প্রতিষ্ঠানের সংযোগ নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন অথবা নতুন প্রতিষ্ঠান নিবন্ধন করুন।'
          : 'This Google account is not associated with an authorized business. Please contact your administrator or create a new company account.'
      )
    } else if (errParam === 'unauthorized') {
      setStatusMessage(
        locale === 'bn'
          ? 'আপনার প্রতিষ্ঠানের ওয়ার্কস্পেসে প্রবেশ করতে অনুগ্রহ করে সাইন ইন করুন।'
          : 'Please sign in to access your business workspace.'
      )
    } else if (errParam === 'cancelled') {
      setError(
        locale === 'bn'
          ? 'গুগল সাইন ইন বাতিল করা হয়েছে।'
          : 'Google sign-in was cancelled.'
      )
    } else if (errParam === 'oauth_error' || errParam === 'oauth_failure' || errParam === 'auth-code-error') {
      const baseMsg =
        locale === 'bn'
          ? 'গুগল সাইন ইন সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
          : "We couldn't complete Google sign-in. Please try again."
      setError(errDescParam ? `${baseMsg} (${errDescParam})` : baseMsg)
    } else if (errParam === 'provider_unavailable') {
      setError(
        locale === 'bn'
          ? 'গুগল সাইন ইন সাময়িকভাবে অনুপলব্ধ। কিছুক্ষণ পর আবার চেষ্টা করুন।'
          : 'Google sign-in is temporarily unavailable. Please try again later.'
      )
    } else if (errParam === 'session_failure') {
      setError(
        locale === 'bn'
          ? 'সেশন তৈরি করা সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : "We couldn't create your session. Please try again."
      )
    } else if (errParam === 'session_expired') {
      setError(
        locale === 'bn'
          ? 'আপনার সেশনের মেয়াদ শেষ হয়েছে। পুনরায় সাইন ইন করুন।'
          : 'Your session has expired. Please sign in again to continue.'
      )
    } else if (errParam === 'platform_user_on_tenant_portal') {
      setIsPlatformAdminError(true)
    } else if (errParam) {
      setError(errDescParam || errParam)
    }

    if (loggedOutParam === 'true') {
      setStatusMessage(
        locale === 'bn'
          ? 'আপনি সফলভাবে লগআউট হয়েছেন।'
          : 'You have been securely signed out of your session.'
      )
    } else if (searchParams.get('session_required') === 'true') {
      setStatusMessage(
        locale === 'bn'
          ? 'আপনার সেশন পুনরায় যাচাই করা প্রয়োজন। অনুগ্রহ করে সাইন ইন করুন।'
          : 'Please sign in to continue to your workspace.'
      )
    }
  }, [searchParams, setValue, locale])

  const performLogin = async (email: string, pass: string) => {
    setIsLoading(true)
    setError(null)
    setIsPlatformAdminError(false)
    setIsNetworkError(false)
    setStatusMessage(null)

    const normalizedEmail = email.trim().toLowerCase()

    // Save or clear remembered email
    try {
      if (rememberMe) {
        localStorage.setItem(SAVED_EMAIL_STORAGE_KEY, normalizedEmail)
      } else {
        localStorage.removeItem(SAVED_EMAIL_STORAGE_KEY)
      }
    } catch {
      // Non-blocking
    }

    try {
      const res = await signInAction(normalizedEmail, pass)

      if (res.success && res.data) {
        if (res.data.requiresOnboarding || !res.data.session.companySlug) {
          window.location.href = '/onboarding'
          return
        }

        const targetSlug = res.data.session.companySlug || 'my-company'
        const paramRedirect = searchParams.get('redirectTo')

        // Resolve active host topology to avoid redundant slug prefixes on subdomains
        let isCurrentHostSubdomain = false
        let currentHostTenantSlug: string | null = null
        let isLocalhost = false
        let isPslDomain = false
        if (typeof window !== 'undefined') {
          const resHost = resolveHostname(window.location.host)
          isLocalhost = Boolean(
            resHost.isLocalhost ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
          )
          isPslDomain = Boolean(
            window.location.hostname.endsWith('.vercel.app') ||
            window.location.hostname.endsWith('.pages.dev') ||
            window.location.hostname.endsWith('.netlify.app')
          )
          if (resHost.hostType === 'tenant') {
            isCurrentHostSubdomain = true
            currentHostTenantSlug = resHost.tenantSlug
          }
        }

        let destination: string
        if (isCurrentHostSubdomain) {
          if (currentHostTenantSlug && currentHostTenantSlug !== targetSlug) {
            // User logged in on workspace A, but account belongs to workspace B
            if (isLocalhost || isPslDomain) {
              const cleanSub = paramRedirect && !paramRedirect.startsWith('/login') ? paramRedirect : '/dashboard'
              const formattedSubPath = cleanSub.startsWith('/') ? cleanSub : `/${cleanSub}`
              destination = `/${targetSlug}${formattedSubPath}`
            } else {
              window.location.href = getTenantLink(targetSlug, paramRedirect || '/dashboard')
              return
            }
          } else {
            // Authenticated directly on matching tenant subdomain -> clean relative URL
            let clean = '/dashboard'
            if (paramRedirect && paramRedirect.startsWith('/') && !paramRedirect.startsWith('/login')) {
              clean = paramRedirect
              if (clean.startsWith(`/${targetSlug}/`)) {
                clean = clean.slice(`/${targetSlug}`.length) || '/dashboard'
              } else if (clean === `/${targetSlug}`) {
                clean = '/dashboard'
              }
            }
            destination = clean
          }
        } else {
          // On root domain (e.g. inkflow.com.bd, inkflow-erp.vercel.app, localhost:3000)
          let cleanSubPath = '/dashboard'
          if (paramRedirect && paramRedirect.startsWith('/') && !paramRedirect.startsWith('/login')) {
            cleanSubPath = paramRedirect
            if (cleanSubPath.startsWith(`/${targetSlug}/`)) {
              cleanSubPath = cleanSubPath.slice(`/${targetSlug}`.length) || '/dashboard'
            } else if (cleanSubPath === `/${targetSlug}`) {
              cleanSubPath = '/dashboard'
            }
          }
          if (isLocalhost || isPslDomain) {
            const formattedSubPath = cleanSubPath.startsWith('/') ? cleanSubPath : `/${cleanSubPath}`
            destination = `/${targetSlug}${formattedSubPath}`
          } else {
            destination = getTenantLink(targetSlug, cleanSubPath)
          }
        }

        // Hard redirect to force HTTP request headers to include the updated tenant session cookie
        window.location.href = destination
      } else {
        const errorMsg = res.error || 'Invalid email or password'
        setError(errorMsg)
        
        // Detect if a platform admin attempted to sign in on the tenant portal
        if (
          errorMsg.toLowerCase().includes('platform') ||
          errorMsg.toLowerCase().includes('business workspace') ||
          errorMsg.toLowerCase().includes('control center')
        ) {
          setIsPlatformAdminError(true)
        }
      }
    } catch (err: any) {
      if (!navigator.onLine || err?.message?.includes('fetch') || err?.message?.includes('network')) {
        setIsNetworkError(true)
        setError(
          locale === 'bn'
            ? 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।'
            : 'Network connection failure. Unable to communicate with the authentication server.'
        )
      } else {
        setError(err?.message || 'Authentication failed. Please verify your credentials.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    await performLogin(data.email, data.password)
  }

  const handleGoogleLogin = async () => {
    if (isGoogleLoading || isLoading) return
    setIsGoogleLoading(true)
    setError(null)
    setIsPlatformAdminError(false)
    setIsNetworkError(false)
    try {
      const redirectToParam = searchParams.get('redirectTo')
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const callbackUrl = redirectToParam
        ? `${origin}/auth/callback?next=${encodeURIComponent(redirectToParam)}`
        : `${origin}/auth/callback`

      // 1. Primary: Secure Server Action initialization (immune to client-side env bundler stripping)
      const res = await signInWithGoogleAction(callbackUrl)
      if (res.success && res.url) {
        window.location.href = res.url
        return
      }

      // 2. Fallback: Client SDK Provider
      if (!res.success) {
        const provider = new GoogleOAuthProvider()
        const clientRes = await provider.signInWithGoogle({ redirectTo: callbackUrl })
        if (clientRes.success && clientRes.data?.url) {
          window.location.href = clientRes.data.url
          return
        }

        const errorMsg = clientRes.error || res.error || ''
        const lowerMsg = errorMsg.toLowerCase()

        if (
          lowerMsg.includes('provider is not enabled') ||
          lowerMsg.includes('unsupported provider') ||
          lowerMsg.includes('disabled') ||
          lowerMsg.includes('not configured')
        ) {
          setError(
            locale === 'bn'
              ? 'গুগল সাইন ইন সাময়িকভাবে অনুপলব্ধ। কিছুক্ষণ পর আবার চেষ্টা করুন।'
              : 'Google sign-in is temporarily unavailable. Please try again later.'
          )
        } else if (!navigator.onLine || lowerMsg.includes('fetch') || lowerMsg.includes('network')) {
          setIsNetworkError(true)
          setError(
            locale === 'bn'
              ? 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।'
              : 'Network connection failure. Unable to communicate with the authentication server.'
          )
        } else {
          const detail = errorMsg ? `: ${errorMsg}` : ''
          setError(
            locale === 'bn'
              ? `গুগল সাইন ইন সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।${detail}`
              : `We couldn't complete Google sign-in. Please try again.${detail}`
          )
        }
        setIsGoogleLoading(false)
      }
    } catch (err: any) {
      const detail = err?.message ? `: ${err.message}` : ''
      setError(
        locale === 'bn'
          ? `গুগল সাইন ইন সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।${detail}`
          : `We couldn't complete Google sign-in. Please try again.${detail}`
      )
      setIsGoogleLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-2xl shadow-slate-200/50 dark:border-border/90 dark:shadow-black/40 backdrop-blur-xl">
      <CardHeader className="space-y-1.5 text-center pb-3 pt-6 px-5 sm:px-6">
        <div>
          <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground dark:text-white">
            {t('auth.login_title')}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {t('auth.login_subtitle')}
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-3.5 pt-1 px-5 sm:px-6">
          {/* Status Feedback / Signed Out Message */}
          {statusMessage && (
            <div className="rounded-xl bg-success-surface p-3 text-xs text-success bg-success-surface/60 text-success border border-success-border border-success-border flex items-start gap-2.5 animate-in fade-in-50 duration-200">
              <CheckCircle2 className="h-4 w-4 text-success text-success shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{statusMessage}</div>
            </div>
          )}

          {/* Standard Error Alert Box */}
          {error && (
            <div className="rounded-xl bg-danger-surface p-3 text-xs text-destructive bg-danger-surface/60 text-destructive border border-danger-border border-danger-border/80 flex items-start gap-2.5 animate-in fade-in-50 duration-200">
              <ShieldAlert className="h-4 w-4 text-destructive text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <span className="font-medium leading-relaxed">{error}</span>
                {isNetworkError && (
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => performLogin(currentEmail, currentPassword)}
                      className="text-xs h-6 border-danger-border bg-danger-surface hover:bg-destructive text-destructive border-danger-border bg-destructive/40 text-destructive cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {locale === 'bn' ? 'পুনরায় চেষ্টা করুন' : 'Try Again'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cross-Portal Platform Administrator Redirection Callout */}
          {isPlatformAdminError && (
            <div className="p-3 rounded-xl border border-primary/20/40 text-xs text-primary flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg shadow-purple-950/30 animate-in fade-in-50">
              <div className="space-y-0.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>{locale === 'bn' ? 'প্ল্যাটফর্ম অ্যাডমিন অ্যাকাউন্ট' : 'Platform Administrator Account'}</span>
                </div>
                <div className="text-xs text-primary">
                  {locale === 'bn'
                    ? 'সুপারঅ্যাডমিনদের জন্য আলাদা প্ল্যাটফর্ম কন্ট্রোল সেন্টার পোর্টাল রয়েছে।'
                    : 'Superadmins must sign in via the dedicated Platform Control Center.'}
                </div>
              </div>

              <Link
                href="/platform/login"
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary text-white font-semibold text-xs transition-colors shrink-0 shadow-sm"
              >
                <span>{locale === 'bn' ? 'প্ল্যাটফর্ম লগইন' : 'Go to Platform Login'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Email / Username / Phone Input Field */}
          <div className="space-y-1.5">
            <Label required htmlFor="tenant-login-email">
              {locale === 'bn' ? 'ইমেইল, মোবাইল বা ইউজারনেম' : 'Email, Username or Mobile'}
            </Label>
            <Input
              id="tenant-login-email"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              icon={<Mail className="h-4 w-4" />}
              placeholder="user@company.com or username / mobile"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>

          {/* Password Input Field with Caps Lock Warning */}
          <div className="space-y-1.5">
            <Label required htmlFor="tenant-login-password">
              {t('auth.password')}
            </Label>
            <Input
              id="tenant-login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              icon={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              {...register('password')}
              onKeyDown={(e) => {
                if (e.getModifierState) {
                  setIsCapsLock(e.getModifierState('CapsLock'))
                }
              }}
              onKeyUp={(e) => {
                if (e.getModifierState) {
                  setIsCapsLock(e.getModifierState('CapsLock'))
                }
              }}
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-muted-foreground hover:text-muted-foreground transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            {/* Caps Lock Alert Notification */}
            {isCapsLock && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warning text-warning pt-0.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{t('auth.caps_lock_on') || 'Caps Lock is ON'}</span>
              </div>
            )}
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-medium">
                {t('auth.remember_me') || 'Remember Me'}
              </span>
            </label>

            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary text-primary dark:hover:text-primary font-medium transition-colors hover:underline py-0.5"
            >
              {t('auth.forgot_password')}
            </Link>
          </div>

          {/* Primary Submit Button */}
          <Button
            type="submit"
            className="w-full hover: hover: text-white font-bold cursor-pointer h-11 text-sm shadow-lg shadow-cyan-600/20 border border-primary/20/30 transition-all active:scale-[0.99]"
            isLoading={isLoading}
          >
            <span>{t('auth.sign_in')}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="relative my-2.5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border dark:border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
              <span className="bg-card px-2.5 text-muted-foreground dark:bg-card">
                {locale === 'bn' ? 'অথবা' : 'Or continue with'}
              </span>
            </div>
          </div>

          {/* Google SSO Login Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            isLoading={isGoogleLoading}
            disabled={isGoogleLoading || isLoading}
            className="w-full text-xs font-semibold cursor-pointer h-10 border-border hover:bg-muted dark:hover:bg-muted"
          >
            <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {isGoogleLoading
                ? locale === 'bn'
                  ? 'গুগলের সাথে সংযুক্ত হচ্ছে...'
                  : 'Connecting to Google...'
                : locale === 'bn'
                ? 'গুগল ওয়ার্কস্পেস দিয়ে এগিয়ে যান'
                : 'Continue with Google Workspace'}
            </span>
          </Button>
        </CardContent>

        {/* Card Footer: Sign Up Link */}
        <CardFooter className="flex flex-col space-y-3 pt-4 pb-5 px-5 sm:px-6 text-center text-xs text-muted-foreground border-t border-border dark:border-border/80">
          <div>
            {t('auth.no_account')}{' '}
            <Link
              href="/register"
              className="font-bold text-primary hover:text-primary text-primary dark:hover:text-primary transition-colors hover:underline py-1"
            >
              {t('auth.sign_up')}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground dark:text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>Loading login portal...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

