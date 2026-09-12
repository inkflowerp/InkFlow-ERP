'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react'
import {
  verifyRegistrationOtpAction,
  verifyRegistrationTokenAction,
  resendVerificationOtpAction,
} from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

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

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Live countdown timer for 60s resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Auto-verify if token is present in query params
  useEffect(() => {
    if (tokenParam && email && !isVerified && !isLoading) {
      const autoVerifyToken = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const res = await verifyRegistrationTokenAction(tokenParam, email)
          if (res.success) {
            setIsVerified(true)
            setSuccessMsg(locale === 'bn' ? 'ইমেইল সফলভাবে নিশ্চিত হয়েছে!' : 'Email successfully verified!')
            setTimeout(() => {
              const targetUrl = planParam ? `/onboarding?plan=${encodeURIComponent(planParam)}` : '/onboarding'
              window.location.href = targetUrl
            }, 1200)
          } else {
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
  }, [tokenParam, email, isVerified, locale, planParam])

  // Focus the first input field on mount
  useEffect(() => {
    if (inputRefs.current[0] && !tokenParam) {
      inputRefs.current[0].focus()
    }
  }, [tokenParam])

  const handleDigitChange = (index: number, val: string) => {
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
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
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
        setIsVerified(true)
        setSuccessMsg(locale === 'bn' ? 'ইমেইল সফলভাবে নিশ্চিত হয়েছে!' : 'Email successfully verified!')
        setTimeout(() => {
          const targetUrl = planParam ? `/onboarding?plan=${encodeURIComponent(planParam)}` : '/onboarding'
          window.location.href = targetUrl
        }, 1200)
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
    if (cooldown > 0 || isResending) return
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
    <Card className="border-slate-200/80 shadow-2xl dark:border-slate-800">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 mb-1">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight">
          {t('auth.verify_email_title') || 'Verify Your Email'}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('auth.verify_email_subtitle') || "We've sent a 6-digit verification code to your email address."}
        </CardDescription>
        {email && (
          <div className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mx-auto mt-1">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            <span>{email}</span>
          </div>
        )}
      </CardHeader>

      <form onSubmit={handleVerify}>
        <CardContent className="space-y-4 pt-1">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 6-Digit Verification Code Inputs */}
          <div className="space-y-2">
            <label className="block text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('auth.enter_verification_code') || 'Enter 6-Digit Code'}
            </label>
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
                  className="h-12 w-10 sm:h-14 sm:w-12 rounded-lg border border-slate-300 bg-white text-center text-xl font-bold text-slate-900 shadow-sm transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
            {t('auth.use_link_instead') || 'Use the verification link sent to your email to verify automatically.'}
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3.5 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="submit"
            className="w-full justify-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold h-11 text-sm shadow-md"
            isLoading={isLoading}
            disabled={isLoading || isVerified}
          >
            <span>{isVerified ? (locale === 'bn' ? 'যাচাই সম্পন্ন!' : 'Verified!') : (t('auth.verify_btn') || 'Verify Email')}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Resend Code Section with Cooldown */}
          <div className="flex items-center justify-between w-full pt-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {t('auth.didnt_receive_code') || "Didn't receive the code?"}
            </span>
            {cooldown > 0 ? (
              <span className="font-semibold text-slate-400 dark:text-slate-500">
                {locale === 'bn' ? `পুনরায় পাঠানো যাবে (${cooldown}s)` : `Resend in ${cooldown}s`}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || isLoading}
                className="inline-flex items-center gap-1 font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Sending...' : t('auth.resend_code') || 'Resend Code'}</span>
              </button>
            )}
          </div>

          <div className="pt-2 text-center text-xs">
            <Link
              href="/login"
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
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
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Loading verification...</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
