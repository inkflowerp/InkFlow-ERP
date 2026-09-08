'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/features/auth/auth.schemas'
import { forgotPasswordAction } from '@/actions/auth.actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

export default function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useI18n()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)
    const res = await forgotPasswordAction(data.email)
    if (res.success) {
      setIsSent(true)
    } else {
      setError(res.error || 'Failed to send password reset email.')
    }
    setIsLoading(false)
  }

  return (
    <Card className="border-slate-200/80 shadow-xl dark:border-slate-800">
      <CardHeader className="space-y-1 text-left pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          {t('auth.reset_password')}
        </CardTitle>
        <CardDescription>
          Enter your email and we will send you a reset link.
        </CardDescription>
      </CardHeader>

      {isSent ? (
        <CardContent className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-100">
            Reset link dispatched
          </h4>
          <p className="text-xs text-slate-500">
            If an account exists with this email, you will receive password reset instructions shortly.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                {t('auth.back_to_login')}
              </Button>
            </Link>
          </div>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-300 border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label required>{t('auth.email')}</Label>
              <Input
                type="email"
                icon={<Mail className="h-4 w-4" />}
                placeholder="owner@yourprintshop.com"
                {...register('email')}
                error={errors.email?.message}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button
              type="submit"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              {t('auth.send_reset_link')}
            </Button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('auth.back_to_login')}</span>
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
