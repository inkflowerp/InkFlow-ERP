'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { resetPasswordSchema, ResetPasswordFormData } from '@/features/auth/auth.schemas'
import { confirmPasswordResetAction, resetPasswordAction } from '@/actions/auth.actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

function ResetPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token') || ''
  const emailParam = searchParams.get('email') || ''
  const { t, locale } = useI18n()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      if (tokenParam && emailParam) {
        const res = await confirmPasswordResetAction(emailParam.trim().toLowerCase(), tokenParam, data.password)
        if (res.success) {
          setIsSuccess(true)
          setTimeout(() => router.push('/login'), 2000)
        } else {
          setError(res.error || 'Failed to update password.')
        }
      } else {
        const res = await resetPasswordAction(data.password)
        if (res.success) {
          setIsSuccess(true)
          setTimeout(() => router.push('/login'), 2000)
        } else {
          setError(res.error || 'Failed to update password.')
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-2xl dark:border-slate-800">
      <CardHeader className="space-y-1 text-left pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          {locale === 'bn' ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set New Password'}
        </CardTitle>
        <CardDescription>
          {locale === 'bn'
            ? 'আপনার একাউন্ট নিরাপদ রাখতে নতুন পাসওয়ার্ড লিখুন।'
            : 'Enter your new password to secure your account.'}
        </CardDescription>
      </CardHeader>

      {isSuccess ? (
        <CardContent className="space-y-4 py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
            {t('auth.password_updated_title') || 'Password updated successfully'}
          </h4>
          <p className="text-xs text-slate-500">
            {locale === 'bn' ? 'লগইন পেজে রিডাইরেক্ট করা হচ্ছে...' : 'Redirecting to login page...'}
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold">
                {t('auth.sign_in') || 'Sign In'}
              </Button>
            </Link>
          </div>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
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
                {...register('password')}
                error={errors.password?.message}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label required>{t('auth.confirm_new_password') || 'Confirm New Password'}</Label>
              <Input
                type="password"
                icon={<Lock className="h-4 w-4" />}
                placeholder="••••••••"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button
              type="submit"
              className="w-full justify-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold h-11 text-sm shadow-md"
              isLoading={isLoading}
            >
              <span>{locale === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Password'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Loading reset form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
