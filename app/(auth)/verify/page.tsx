'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, ShieldCheck, Check, Lock } from 'lucide-react'
import {
  verifyRegistrationOtpAction,
  verifyRegistrationTokenAction,
  checkEmailVerificationStatusAction,
  resendVerificationOtpAction,
} from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'
import { getTenantLink } from '@/lib/tenant/tenant-url'

function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') || ''
  const tokenParam = searchParams.get('token') || ''
  const purposeParam = searchParams.get('purpose') || 'registration'
  const planParam = searchParams.get('plan') || ''
  const { t, locale } = useI18n()

  const [email] = useState<string>(emailParam.trim().toLowerCase())
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState<number>(60)
  const [isVerified, setIsVerified] = useState(false)
  const [isLinkVerified, setIsLinkVerified] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Live countdown timer for 60s resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleVerifiedSuccess = useCallback(
    (viaLink = false, customDestination?: string) => {
      setIsVerified(true)
      if (viaLink) {
        setIsLinkVerified(true)
      }
      setError(null)

      const isDashboard = customDestination && customDestination.includes('/dashboard')
      setSuccessMsg(
        viaLink
          ? locale === 'bn'
            ? isDashboard
              ? 'ভেরিফিকেশন সম্পন্ন হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...'
              : 'ভেরিফিকেশন লিংকের মাধ্যমে ইমেইল যাচাই সম্পন্ন হয়েছে! ওটিপি ফর্ম সমাপ্ত করা হয়েছে। অনবোর্ডিং-এ নিয়ে যাওয়া হচ্ছে...'
            : isDashboard
            ? 'Email verified! Redirecting to dashboard...'
            : 'Email verified via link! OTP submission expired. Redirecting to onboarding...'
          : locale === 'bn'
          ? isDashboard
            ? 'ইমেইল সফলভাবে নিশ্চিত হয়েছে! ড্যাশবোর্ডে পাঠানো হচ্ছে...'
            : 'ইমেইল সফলভাবে নিশ্চিত হয়েছে! অনবোর্ডিং-এ পাঠানো হচ্ছে...'
          : isDashboard
          ? 'Email successfully verified! Redirecting to dashboard...'
          : 'Email successfully verified! Redirecting to onboarding...'
      )

      // Broadcast verification event to other active tabs / windows
      if (email) {
        try {
          const bc = new BroadcastChannel('printflow_verification_channel')
          bc.postMessage({ type: 'EMAIL_VERIFIED', email, destinationUrl: customDestination })
          bc.close()
        } catch {}

        try {
          localStorage.setItem(
            'printflow_last_verified_email',
            JSON.stringify({ email, destinationUrl: customDestination, timestamp: Date.now() })
          )
          localStorage.removeItem('printflow_active_workspace')
        } catch {}
      }

      setTimeout(async () => {
        let targetUrl = customDestination
        if (!targetUrl) {
          try {
            const statusRes = await checkEmailVerificationStatusAction(email)
            if (statusRes.success && (statusRes.data as any)?.destinationUrl) {
              targetUrl = (statusRes.data as any).destinationUrl
            }
          } catch {}
        }
        if (!targetUrl) {
          targetUrl = planParam ? `/onboarding?plan=${encodeURIComponent(planParam)}` : '/onboarding'
        }
        window.location.href = targetUrl
      }, 1200)
    },
    [email, locale, planParam]
  )

  // Check initial verification status on mount (handles reload or navigation when already verified/onboarded)
  useEffect(() => {
    if (!email || isVerified || tokenParam) return
    const checkInitial = async () => {
      try {
        const res = await checkEmailVerificationStatusAction(email)
        if (res.success && res.data?.isVerified) {
          const dest = (res.data as any)?.destinationUrl || (
            (res.data as any)?.session?.companySlug && !(res.data as any)?.requiresOnboarding
              ? (window.location.hostname.includes('localhost')
                  ? `/${(res.data as any).session.companySlug}/dashboard`
                  : getTenantLink((res.data as any).session.companySlug, '/dashboard'))
              : undefined
          )
          handleVerifiedSuccess(true, dest)
        }
      } catch {}
    }
    checkInitial()
  }, [email, isVerified, tokenParam, handleVerifiedSuccess])

  // Auto-verify if token is present in query params (Magic Link flow)
  useEffect(() => {
    if (tokenParam && email && !isVerified && !isLoading) {
      const autoVerifyToken = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const res = await verifyRegistrationTokenAction(tokenParam, email)
          if (res.success) {
            const dest = (res.data as any)?.destinationUrl || (
              (res.data as any)?.session?.companySlug && !(res.data as any)?.requiresOnboarding
                ? (window.location.hostname.includes('localhost')
                    ? `/${(res.data as any).session.companySlug}/dashboard`
                    : getTenantLink((res.data as any).session.companySlug, '/dashboard'))
                : undefined
            )
            handleVerifiedSuccess(true, dest)
          } else {
            if (email) {
              try {
                const checkRes = await checkEmailVerificationStatusAction(email)
                if (checkRes.success && checkRes.data?.isVerified) {
                  const dest = (checkRes.data as any)?.destinationUrl || (
                    (checkRes.data as any)?.session?.companySlug && !(checkRes.data as any)?.requiresOnboarding
                      ? (window.location.hostname.includes('localhost')
                          ? `/${(checkRes.data as any).session.companySlug}/dashboard`
                          : getTenantLink((checkRes.data as any).session.companySlug, '/dashboard'))
                      : undefined
                  )
                  handleVerifiedSuccess(true, dest)
                  return
                }
              } catch {}
            }
            setError(res.error || 'Failed to verify verification link.')
          }
        } catch (e: any) {
          setError(e?.message || 'Verification link failed')
        } finally {
          setIsLoading(false)
        }
      }
      autoVerifyToken()
    }
  }, [tokenParam, email, isVerified, handleVerifiedSuccess])

  // Listen for Cross-Tab / Cross-Window Verification Broadcasts
  useEffect(() => {
    if (!email || isVerified) return

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('printflow_verification_channel')
      bc.onmessage = (event) => {
        if (event.data?.type === 'EMAIL_VERIFIED') {
          const verifiedEmail = (event.data.email || '').trim().toLowerCase()
          if (!email || verifiedEmail === email) {
            handleVerifiedSuccess(true, event.data.destinationUrl)
          }
        }
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'printflow_last_verified_email' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue)
          const verifiedEmail = (data?.email || '').trim().toLowerCase()
          if (!email || verifiedEmail === email) {
            handleVerifiedSuccess(true, data.destinationUrl)
          }
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      if (bc) bc.close()
      window.removeEventListener('storage', handleStorage)
    }
  }, [email, isVerified, handleVerifiedSuccess])

  // Live Status Polling: Detects link verification on mobile or other devices
  useEffect(() => {
    if (!email || isVerified || tokenParam) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await checkEmailVerificationStatusAction(email)
        if (res.success && res.data?.isVerified) {
          handleVerifiedSuccess(true, res.data.destinationUrl)
        }
      } catch {
        // Non-blocking poll
      }
    }, 2500)

    return () => clearInterval(pollInterval)
  }, [email, isVerified, tokenParam, handleVerifiedSuccess])

  // Focus the first input field on mount
  useEffect(() => {
    if (inputRefs.current[0] && !tokenParam && !isVerified) {
      inputRefs.current[0].focus()
    }
  }, [tokenParam, isVerified])

  const handleDigitChange = (index: number, val: string) => {
    if (isVerified) return
    // Only accept numeric characters
    const numeric = val.replace(/\D/g, '')

    // Handle full 6-digit paste into single field
    if (numeric.length > 1) {
      const chars = numeric.slice(0, 6).split('')
      const nextDigits = [...digits]
      chars.forEach((c, i) => {
        if (i < 6) nextDigits[i] = c
      })
      setDigits(nextDigits)
      const targetIndex = Math.min(chars.length, 5)
      inputRefs.current[targetIndex]?.focus()
      return
    }

    const nextDigits = [...digits]
    nextDigits[index] = numeric.slice(-1)
    setDigits(nextDigits)

    // Auto-advance to next input field
    if (numeric && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isVerified) return
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (isVerified) return
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const chars = pasted.split('')
    const nextDigits = ['', '', '', '', '', '']
    chars.forEach((c, i) => {
      if (i < 6) nextDigits[i] = c
    })
    setDigits(nextDigits)
    const targetIndex = Math.min(chars.length, 5)
    inputRefs.current[targetIndex]?.focus()
  }

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isVerified) return

    const otp = digits.join('')

    if (otp.length < 6) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে সম্পূর্ণ ৬-সংখ্যার কোডটি লিখুন।' : 'Please enter the complete 6-digit verification code.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await verifyRegistrationOtpAction(email, otp)
      if (res.success) {
        const dest = (res.data as any)?.session?.companySlug && !(res.data as any)?.requiresOnboarding
          ? getTenantLink((res.data as any).session.companySlug, '/dashboard')
          : undefined
        handleVerifiedSuccess(false, dest)
      } else {
        setError(res.error || 'Invalid or expired verification code.')
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || isResending || isVerified) return
    setIsResending(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await resendVerificationOtpAction(email, purposeParam as any)
      if (res.success) {
        setCooldown(60)
        setSuccessMsg(
          locale === 'bn'
            ? 'আপনার ইমেইলে নতুন একটি ভেরিফিকেশন কোড পাঠানো হয়েছে।'
            : 'A fresh verification code has been sent to your email.'
        )
      } else {
        setError(res.error || 'Failed to resend verification code.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="border-border shadow-2xl dark:border-border">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${isVerified ? 'bg-success-surface text-success bg-success-surface/60 text-success' : 'bg-info-surface text-primary bg-primary/10 text-primary'} mb-1 transition-colors`}>
          {isVerified ? <CheckCircle2 className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
        </div>
        <CardTitle className="text-xl font-bold tracking-tight">
          {isVerified
            ? (locale === 'bn' ? 'ইমেইল যাচাই সম্পন্ন' : 'Email Verified')
            : (t('auth.verify_email_title') || 'Verify Your Email')}
        </CardTitle>
        <CardDescription className="text-xs">
          {isVerified
            ? (locale === 'bn' ? 'আপনার অ্যাকাউন্ট সক্রিয় হয়েছে। অনবোর্ডিং-এ পাঠানো হচ্ছে...' : 'Your account is active. Redirecting to onboarding...')
            : (t('auth.verify_email_subtitle') || "We've sent a 6-digit verification code to your email address.")}
        </CardDescription>
        {email && (
          <div className="inline-flex items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground mx-auto mt-1">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{email}</span>
          </div>
        )}
      </CardHeader>

      <form onSubmit={handleVerify}>
        <CardContent className="space-y-4 pt-1">
          {isLinkVerified && (
            <div className="flex items-center gap-2 rounded-lg bg-info-surface p-3 text-xs text-primary bg-primary/10 text-primary border border-primary/20 border-border font-semibold animate-pulse">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>
                {locale === 'bn'
                  ? 'ভেরিফিকেশন লিংকের মাধ্যমে ইমেইল নিশ্চিত করা হয়েছে। ওটিপি ফর্ম স্বয়ংক্রিয়ভাবে বন্ধ করা হয়েছে।'
                  : 'Email verified via verification link. OTP submission is expired and closed.'}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-surface p-3 text-xs text-destructive bg-danger-surface text-destructive border border-danger-border border-danger-border">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-success-surface p-3 text-xs text-success bg-success-surface text-success border border-success-border border-success-border">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 6-Digit Verification Code Inputs */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground dark:text-muted-foreground">
              {isVerified ? (
                <span className="text-success text-success flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {locale === 'bn' ? 'ওটিপি ইনপুট সমাপ্ত' : 'OTP Code Expired / Verified'}
                </span>
              ) : (
                <span>{t('auth.enter_verification_code') || 'Enter 6-Digit Code'}</span>
              )}
            </div>
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isLoading || isVerified}
                  className={`h-12 w-10 sm:h-14 sm:w-12 rounded-lg border text-center text-xl font-bold shadow-sm transition-all focus:outline-none ${
                    isVerified
                      ? 'border-success-border bg-success-surface/50 text-success border-success-border bg-success-surface text-success cursor-not-allowed opacity-80'
                      : 'border-input bg-card text-foreground focus:border-primary/20 focus:ring-2 focus:ring-ring/30 disabled:opacity-50'
                  }`}
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {!isVerified && (
            <p className="text-center text-xs text-muted-foreground dark:text-muted-foreground">
              {t('auth.use_link_instead') || 'Use the verification link sent to your email to verify automatically.'}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3.5 border-t border-border pt-4">
          <Button
            type="submit"
            className={`w-full justify-center gap-2 font-bold h-11 text-sm shadow-md transition-all ${
              isVerified
                ? 'bg-success hover:bg-success text-white cursor-default'
                : '    hover: hover: text-white'
            }`}
            isLoading={isLoading}
            disabled={isLoading || isVerified}
          >
            {isVerified ? (
              <>
                <Check className="h-4 w-4" />
                <span>{locale === 'bn' ? 'যাচাই সম্পন্ন! রিডাইরেক্ট করা হচ্ছে...' : 'Verified! Redirecting...'}</span>
              </>
            ) : (
              <>
                <span>{t('auth.verify_btn') || 'Verify Email'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          {/* Resend Code Section with Cooldown */}
          {!isVerified && (
            <div className="flex items-center justify-between w-full pt-1 text-xs">
              <span className="text-muted-foreground dark:text-muted-foreground">
                {t('auth.didnt_receive_code') || "Didn't receive the code?"}
              </span>
              {cooldown > 0 ? (
                <span className="font-semibold text-muted-foreground bangla-text">
                  {locale === 'bn' ? `পুনরায় পাঠানো যাবে (${cooldown} সেকেন্ড)` : `Resend in ${cooldown}s`}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || isLoading}
                  className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary text-primary hover:underline cursor-pointer disabled:opacity-50 bangla-text"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? (locale === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...') : t('auth.resend_code') || 'Resend Code'}</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-2 text-center text-xs">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← {t('auth.back_to_login') || 'Back to Login'}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Loading verification...</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
