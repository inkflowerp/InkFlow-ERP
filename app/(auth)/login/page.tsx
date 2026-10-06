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
  Building2,
  ExternalLink,
} from 'lucide-react'
import { loginSchema, LoginFormData } from '@/features/auth/auth.schemas'
import {
  signInAction,
  signInWithGoogleAction,
  findWorkspaceAction,
  lookupWorkspacesByEmailAction,
} from '@/actions/auth.actions'
import { GoogleOAuthProvider } from '@/lib/auth/auth-providers'
import { resolveHostname } from '@/lib/tenant/tenant-resolution'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { BRAND } from '@/config/brand'
import { k } from '@/lib/brand/keys'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

const SAVED_EMAIL_STORAGE_KEY = k('remembered_email')

/**
 * Root Domain Workspace Finder Form
 * Optional helper for users searching for their tenant workspace by name or email.
 */
function WorkspaceFinderForm({
  rootDomain,
  onBackToLogin,
}: {
  rootDomain: string
  onBackToLogin?: () => void
}) {
  const { locale } = useI18n()
  const [workspaceInput, setWorkspaceInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forgot workspace flow
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [isForgotLoading, setIsForgotLoading] = useState(false)
  const [forgotWorkspaces, setForgotWorkspaces] = useState<Array<{ slug: string; name: string }> | null>(null)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const handleWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = workspaceInput.trim()
    if (!trimmed) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে ওয়ার্কস্পেসের নাম বা কোড লিখুন' : 'Please enter your workspace name or URL code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await findWorkspaceAction(trimmed)
      if (res.success && res.slug) {
        window.location.href = getTenantLink(res.slug, '/login')
      } else {
        setError(res.error || (locale === 'bn' ? 'ওয়ার্কস্পেস পাওয়া যায়নি।' : 'Workspace not found.'))
      }
    } catch (err: any) {
      setError(err?.message || (locale === 'bn' ? 'সার্ভার ত্রুটি ঘটেছে।' : 'Failed to lookup workspace.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotError(locale === 'bn' ? 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা দিন' : 'Please enter a valid email address')
      return
    }

    setIsForgotLoading(true)
    setForgotError(null)
    setForgotWorkspaces(null)

    try {
      const res = await lookupWorkspacesByEmailAction(forgotEmail)
      if (res.success && res.workspaces && res.workspaces.length > 0) {
        setForgotWorkspaces(res.workspaces)
      } else {
        setForgotError(
          locale === 'bn'
            ? 'এই ইমেইল ঠিকানায় কোনো সক্রিয় ওয়ার্কস্পেস পাওয়া যায়নি।'
            : 'No active workspaces found associated with this email address.'
        )
      }
    } catch (err: any) {
      setForgotError(err?.message || (locale === 'bn' ? 'ওয়ার্কস্পেস খুঁজতে সমস্যা হয়েছে।' : 'Error looking up workspaces.'))
    } finally {
      setIsForgotLoading(false)
    }
  }

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="space-y-1.5 text-center pb-4 pt-6 px-6">
        <div className="mx-auto flex items-center justify-center mb-2">
          <img
            src="/logo.png"
            alt={BRAND.name}
            className="h-11 w-11 object-contain rounded-xl p-0.5"
          />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {locale === 'bn' ? `${BRAND.nameBn}-তে সাইন ইন করুন` : `Sign In to ${BRAND.name}`}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {locale === 'bn'
            ? 'লগইন করতে আপনার প্রতিষ্ঠানের ওয়ার্কস্পেস কোড বা নাম লিখুন।'
            : 'Enter your workspace name or URL code to access your printing press portal.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 flex items-start gap-2.5 animate-in fade-in-50">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleWorkspaceSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-input" required>
              {locale === 'bn' ? 'ওয়ার্কস্পেস কোড বা নাম' : 'Workspace Name or URL'}
            </Label>
            <div className="relative flex items-center">
              <Input
                id="workspace-input"
                type="text"
                autoComplete="organization"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. vision-sign"
                value={workspaceInput}
                onChange={(e) => setWorkspaceInput(e.target.value)}
                className="pr-28 font-mono text-sm h-11"
              />
              <span className="absolute right-3 text-xs text-muted-foreground select-none pointer-events-none font-mono">
                .{rootDomain}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold cursor-pointer"
            isLoading={isLoading}
          >
            <span>{locale === 'bn' ? 'এগিয়ে যান' : 'Continue to Workspace'}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </form>

        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => {
              setShowForgot(!showForgot)
              setForgotError(null)
              setForgotWorkspaces(null)
            }}
            className="text-xs text-primary hover:underline font-medium cursor-pointer"
          >
            {showForgot
              ? (locale === 'bn' ? 'ফিরে যান' : 'Back to workspace entry')
              : (locale === 'bn' ? 'ওয়ার্কস্পেস মনে নেই?' : 'Forgot your workspace URL?')}
          </button>
        </div>

        {showForgot && (
          <div className="p-3.5 rounded-lg bg-muted border border-border space-y-3 animate-in fade-in-50">
            <div className="text-xs font-semibold text-foreground">
              {locale === 'bn' ? 'ইমেইল দিয়ে ওয়ার্কস্পেস খুঁজুন' : 'Find Workspace by Email'}
            </div>
            <p className="text-xs text-muted-foreground">
              {locale === 'bn'
                ? 'আপনার অ্যাকাউন্টের ইমেইল ঠিকানা দিন, সংযুক্ত প্রতিষ্ঠানগুলো দেখানো হবে।'
                : 'Enter your account email address to list all associated workspaces.'}
            </p>

            {forgotError && (
              <div className="p-2 rounded bg-destructive/10 text-xs text-destructive border border-destructive/20">
                {forgotError}
              </div>
            )}

            <form onSubmit={handleForgotLookup} className="space-y-2">
              <Input
                type="email"
                placeholder="user@company.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="text-xs h-9 bg-background"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="w-full text-xs h-9 cursor-pointer"
                isLoading={isForgotLoading}
              >
                {locale === 'bn' ? 'ওয়ার্কস্পেস খুঁজুন' : 'Lookup Workspaces'}
              </Button>
            </form>

            {forgotWorkspaces && forgotWorkspaces.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-semibold text-muted-foreground">
                  {locale === 'bn' ? 'পাওয়া গেছে:' : 'Found Workspaces:'}
                </div>
                <div className="space-y-1">
                  {forgotWorkspaces.map((ws) => (
                    <a
                      key={ws.slug}
                      href={getTenantLink(ws.slug, '/login')}
                      className="flex items-center justify-between p-2 rounded-md bg-card hover:bg-muted text-xs border border-border transition-colors group"
                    >
                      <span className="font-semibold text-foreground group-hover:text-primary">
                        {ws.name}
                      </span>
                      <span className="font-mono text-muted-foreground flex items-center gap-1">
                        {ws.slug}.{rootDomain}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2 pt-3 pb-5 px-6 text-center text-xs text-muted-foreground border-t border-border">
        {onBackToLogin && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToLogin}
              className="w-full text-xs font-semibold cursor-pointer h-8"
            >
              {locale === 'bn' ? '← সরাসরি লগইন পোর্টালে ফিরুন' : '← Back to direct sign-in'}
            </Button>
          </div>
        )}
        <div>
          {locale === 'bn' ? 'নতুন প্রতিষ্ঠান নিবন্ধন করবেন?' : "Don't have a workspace yet?"}{' '}
          <Link
            href="/register"
            className="font-bold text-primary hover:underline"
          >
            {locale === 'bn' ? 'রেজিস্টার করুন' : 'Register your Press'}
          </Link>
        </div>
        <div>
          <Link
            href="/platform/login"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {locale === 'bn' ? 'প্ল্যাটফর্ম অ্যাডমিন পোর্টাল' : 'Platform Control Center'}
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

/**
 * Tenant Subdomain & Root Domain Credential Login Form
 * Renders on tenant subdomains ([tenantSlug].printflow.bd) and root domain (printflow.bd/login).
 * Authenticates tenant owners and employees, automatically redirecting to their tenant subdomain.
 */
function TenantLoginForm({
  tenantSlug,
  rootDomain,
  onShowWorkspaceFinder,
}: {
  tenantSlug: string | null
  rootDomain: string
  onShowWorkspaceFinder?: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPlatformAdminError, setIsPlatformAdminError] = useState(false)
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isCapsLock, setIsCapsLock] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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
          ? 'এই গুগল অ্যাকাউন্টটির সাথে এই প্রতিষ্ঠানের সংযোগ নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।'
          : 'This Google account is not associated with this workspace. Please contact your administrator.'
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
      const paramRedirect = searchParams.get('redirectTo') || undefined
      const res = await signInAction(normalizedEmail, pass, paramRedirect)

      if (res.success && res.data) {
        if (res.data.requiresOnboarding || !res.data.session.companySlug) {
          window.location.href = '/onboarding'
          return
        }

        const targetSlug = res.data.session.companySlug

        // Clean relative redirect on matching host (e.g. logging in directly on vision.printflow.bd)
        if (tenantSlug && tenantSlug.toLowerCase() === targetSlug.toLowerCase()) {
          let clean = '/dashboard'
          if (paramRedirect && paramRedirect.startsWith('/') && !paramRedirect.startsWith('/login')) {
            clean = paramRedirect
            if (clean.startsWith(`/${targetSlug}/`)) {
              clean = clean.slice(`/${targetSlug}`.length) || '/dashboard'
            } else if (clean === `/${targetSlug}`) {
              clean = '/dashboard'
            }
          }
          window.location.href = clean
          return
        }

        // Cross-host or root-to-subdomain: use server-provided destinationUrl (with handoff token) or getTenantLink
        if ((res as any).destinationUrl) {
          window.location.href = (res as any).destinationUrl
          return
        }

        // Account belongs to a different workspace -> redirect to that workspace's login
        window.location.href = getTenantLink(targetSlug, paramRedirect || '/dashboard')
      } else {
        const errorMsg = res.error || 'Invalid email or password'
        setError(errorMsg)

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

      const res = await signInWithGoogleAction(callbackUrl)
      if (res.success && res.url) {
        window.location.href = res.url
        return
      }

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
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="space-y-1.5 text-center pb-3 pt-6 px-6">
        {tenantSlug && (
          <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground mx-auto mb-1">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono font-medium text-foreground">{tenantSlug}</span>
            <span className="text-muted-foreground/60">·</span>
            <a
              href={`https://${rootDomain}/login`}
              className="text-primary hover:underline font-normal"
            >
              {locale === 'bn' ? 'পরিবর্তন' : 'Switch'}
            </a>
          </div>
        )}
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t('auth.login_title')}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          {t('auth.login_subtitle')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-3.5 pt-1 px-6">
          {statusMessage && (
            <div className="rounded-lg bg-success-surface p-3 text-xs text-success border border-success flex items-start gap-2.5 animate-in fade-in-50">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{statusMessage}</div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 flex items-start gap-2.5 animate-in fade-in-50">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <span className="font-medium leading-relaxed">{error}</span>
                {isNetworkError && (
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => performLogin(currentEmail, currentPassword)}
                      className="text-xs h-6 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {locale === 'bn' ? 'পুনরায় চেষ্টা করুন' : 'Try Again'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {isPlatformAdminError && (
            <div className="p-3 rounded-lg border border-border bg-muted text-xs text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in-50">
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>{locale === 'bn' ? 'প্ল্যাটফর্ম অ্যাডমিন অ্যাকাউন্ট' : 'Platform Administrator Account'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {locale === 'bn'
                    ? 'সুপারঅ্যাডমিনদের জন্য আলাদা প্ল্যাটফর্ম কন্ট্রোল সেন্টার পোর্টাল রয়েছে।'
                    : 'Superadmins must sign in via the dedicated Platform Control Center.'}
                </div>
              </div>

              <Link
                href="/platform/login"
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold text-xs transition-colors shrink-0"
              >
                <span>{locale === 'bn' ? 'প্ল্যাটফর্ম লগইন' : 'Platform Login'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

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
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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

            {isCapsLock && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warning pt-0.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{t('auth.caps_lock_on') || 'Caps Lock is ON'}</span>
              </div>
            )}
          </div>

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
              className="text-xs text-primary hover:underline font-medium transition-colors py-0.5"
            >
              {t('auth.forgot_password')}
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full font-bold cursor-pointer h-11 text-sm shadow-xs transition-all active:scale-[0.99]"
            isLoading={isLoading}
          >
            <span>{t('auth.sign_in')}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>

          <div className="relative my-2.5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
              <span className="bg-card px-2.5 text-muted-foreground">
                {locale === 'bn' ? 'অথবা' : 'Or continue with'}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            isLoading={isGoogleLoading}
            disabled={isGoogleLoading || isLoading}
            className="w-full text-xs font-semibold cursor-pointer h-10 border-border hover:bg-muted"
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
                ? 'গুগল দিয়ে প্রবেশ করুন'
                : 'Continue with Google'}
            </span>
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 pt-3 pb-5 px-6 text-center text-xs text-muted-foreground border-t border-border">
          <div>
            {t('auth.no_account')}{' '}
            <Link
              href="/register"
              className="font-bold text-primary hover:underline py-1"
            >
              {t('auth.sign_up')}
            </Link>
          </div>
          {onShowWorkspaceFinder && (
            <div>
              <button
                type="button"
                onClick={onShowWorkspaceFinder}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer py-1"
              >
                {locale === 'bn'
                  ? 'ওয়ার্কস্পেসের নাম বা কোড দিয়ে খুঁজবেন? এখানে চাপুন'
                  : 'Looking for your workspace URL? Find workspace'}
              </button>
            </div>
          )}
          {!tenantSlug && (
            <div>
              <Link
                href="/platform/login"
                className="text-muted-foreground hover:text-foreground hover:underline py-1"
              >
                {locale === 'bn' ? 'প্ল্যাটফর্ম অ্যাডমিন পোর্টাল' : 'Platform Control Center'}
              </Link>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}

function LoginForm() {
  const [hostResolution, setHostResolution] = useState<{
    hostType: string
    tenantSlug: string | null
    rootDomain: string
  } | null>(null)
  const [viewMode, setViewMode] = useState<'login' | 'finder'>('login')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const res = resolveHostname(window.location.host)
      setHostResolution({
        hostType: res.hostType,
        tenantSlug: res.tenantSlug,
        rootDomain: res.rootDomain,
      })
    }
  }, [])

  if (!hostResolution) {
    return (
      <Card className="border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-xs">
        <div className="inline-flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>Connecting to authentication portal...</span>
        </div>
      </Card>
    )
  }

  // Tenant subdomain: Render host-isolated credential login
  if (hostResolution.hostType === 'tenant') {
    return (
      <TenantLoginForm
        tenantSlug={hostResolution.tenantSlug}
        rootDomain={hostResolution.rootDomain || BRAND.rootDomain}
      />
    )
  }

  // Root domain: Default to direct credential login for tenant owners & employees
  if (viewMode === 'finder') {
    return (
      <WorkspaceFinderForm
        rootDomain={hostResolution.rootDomain || BRAND.rootDomain}
        onBackToLogin={() => setViewMode('login')}
      />
    )
  }

  return (
    <TenantLoginForm
      tenantSlug={null}
      rootDomain={hostResolution.rootDomain || BRAND.rootDomain}
      onShowWorkspaceFinder={() => setViewMode('finder')}
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground">
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
