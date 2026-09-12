'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, Lock, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react'
import {
  forgotPasswordAction,
  verifyPasswordResetOtpAction,
  confirmPasswordResetAction,
  resendVerificationOtpAction,
} from '@/actions/auth.actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

type ResetStep = 'ENTER_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<ResetStep>('ENTER_EMAIL')
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [resetToken, setResetToken] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState<number>(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const { t, locale } = useI18n()

  // Live countdown timer for 60s resend cooldown in Step 2
  useEffect(() => {
    if (step !== 'VERIFY_OTP' || cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [step, cooldown])

  // Step 1: Submit Email for Password Reset
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে ইমেইল অ্যাড্রেস লিখুন।' : 'Please enter your email address.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await forgotPasswordAction(cleanEmail)
      if (res.success) {
        setStep('VERIFY_OTP')
        setCooldown(60)
        setSuccessMsg(
          locale === 'bn'
            ? 'আপনার ইমেইল ঠিকানায় ৬-সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে।'
            : "We've sent a 6-digit verification code to your email."
        )
      } else {
        setError(res.error || 'Failed to dispatch reset instructions.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to process request.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle OTP digit changes
  const handleDigitChange = (index: number, val: string) => {
    const numeric = val.replace(/\D/g, '')

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

  // Step 2: Verify 6-digit OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const otp = digits.join('')

    if (otp.length < 6) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে সম্পূর্ণ ৬-সংখ্যার কোডটি লিখুন।' : 'Please enter the complete 6-digit verification code.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await verifyPasswordResetOtpAction(email.trim().toLowerCase(), otp)
      if (res.success && res.data?.resetToken) {
        setResetToken(res.data.resetToken)
        setStep('NEW_PASSWORD')
        setSuccessMsg(null)
      } else {
        setError(res.error || 'Invalid or expired verification code.')
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP
  const handleResend = async () => {
    if (cooldown > 0 || isResending) return
    setIsResending(true)
    setError(null)

    try {
      const res = await resendVerificationOtpAction(email.trim().toLowerCase(), 'password_reset')
      if (res.success) {
        setCooldown(60)
        setSuccessMsg(
          locale === 'bn'
            ? 'আপনার ইমেইলে নতুন একটি ভেরিফিকেশন কোড পাঠানো হয়েছে।'
            : 'A fresh verification code has been sent to your email.'
        )
      } else {
        setError(res.error || 'Failed to resend code.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.')
    } finally {
      setIsResending(false)
    }
  }

  // Step 3: Set New Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || newPassword.length < 6) {
      setError(locale === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError(locale === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি।' : 'Passwords do not match.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await confirmPasswordResetAction(email.trim().toLowerCase(), resetToken, newPassword)
      if (res.success) {
        setStep('SUCCESS')
      } else {
        setError(res.error || 'Failed to update password.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-2xl dark:border-slate-800">
      {/* STEP 1: Enter Email */}
      {step === 'ENTER_EMAIL' && (
        <>
          <CardHeader className="space-y-1 text-left pb-4">
            <CardTitle className="text-xl font-bold tracking-tight">
              {t('auth.forgot_password') || 'Forgot Password?'}
            </CardTitle>
            <CardDescription>
              {locale === 'bn'
                ? 'আপনার ইমেইল অ্যাড্রেস লিখুন। আমরা আপনাকে একটি ভেরিফিকেশন কোড পাঠাব।'
                : 'Enter your email address and we will send you a verification code.'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleEmailSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label required>{t('auth.email') || 'Email Address'}</Label>
                <Input
                  type="email"
                  icon={<Mail className="h-4 w-4" />}
                  placeholder="owner@yourprintshop.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                type="submit"
                className="w-full justify-center bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold h-11 text-sm shadow-md"
                isLoading={isLoading}
              >
                <span>{locale === 'bn' ? 'ভেরিফিকেশন কোড পাঠান' : 'Send Verification Code'}</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 pt-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t('auth.back_to_login') || 'Back to Login'}</span>
              </Link>
            </CardFooter>
          </form>
        </>
      )}

      {/* STEP 2: Verify 6-digit OTP */}
      {step === 'VERIFY_OTP' && (
        <>
          <CardHeader className="space-y-1.5 text-center pb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 mb-1">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {t('auth.verify_email_title') || 'Verify Your Email'}
            </CardTitle>
            <CardDescription className="text-xs">
              {locale === 'bn'
                ? `আমরা ${email} ঠিকানায় একটি ৬-সংখ্যার কোড পাঠিয়েছি।`
                : `We've sent a 6-digit verification code to: ${email}`}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleOtpSubmit}>
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
                      className="h-12 w-10 sm:h-14 sm:w-12 rounded-lg border border-slate-300 bg-white text-center text-xl font-bold text-slate-900 shadow-sm transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      aria-label={`Digit ${idx + 1}`}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3.5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                type="submit"
                className="w-full justify-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold h-11 text-sm shadow-md"
                isLoading={isLoading}
              >
                <span>{locale === 'bn' ? 'কোড যাচাই করুন' : 'Verify Code'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="flex items-center justify-between w-full pt-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {t('auth.didnt_receive_code') || "Didn't receive it?"}
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
                    className="inline-flex items-center gap-1 font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>{isResending ? 'Sending...' : t('auth.resend_code') || 'Resend Code'}</span>
                  </button>
                )}
              </div>

              <div className="pt-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setStep('ENTER_EMAIL')}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  ← {locale === 'bn' ? 'ইমেইল পরিবর্তন করুন' : 'Change Email'}
                </button>
              </div>
            </CardFooter>
          </form>
        </>
      )}

      {/* STEP 3: Enter New Password */}
      {step === 'NEW_PASSWORD' && (
        <>
          <CardHeader className="space-y-1 text-left pb-4">
            <CardTitle className="text-xl font-bold tracking-tight">
              {locale === 'bn' ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Create a New Password'}
            </CardTitle>
            <CardDescription>
              {locale === 'bn'
                ? 'আপনার একাউন্টের জন্য একটি শক্তিশালী নতুন পাসওয়ার্ড লিখুন।'
                : 'Enter a strong new password for your account.'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="space-y-3.5">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label required>{t('auth.new_password') || 'New Password'}</Label>
                <Input
                  type="password"
                  icon={<Lock className="h-4 w-4" />}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label required>{t('auth.confirm_new_password') || 'Confirm Password'}</Label>
                <Input
                  type="password"
                  icon={<Lock className="h-4 w-4" />}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                type="submit"
                className="w-full justify-center bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold h-11 text-sm shadow-md"
                isLoading={isLoading}
              >
                <span>{locale === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password'}</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </>
      )}

      {/* STEP 4: Success Message */}
      {step === 'SUCCESS' && (
        <CardContent className="space-y-4 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('auth.password_updated_title') || 'Password Updated'}
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {t('auth.password_updated_subtitle') || 'Your password has been updated successfully. You can now sign in with your new password.'}
          </p>
          <div className="pt-3">
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold">
                {t('auth.sign_in') || 'Sign In'}
              </Button>
            </Link>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
