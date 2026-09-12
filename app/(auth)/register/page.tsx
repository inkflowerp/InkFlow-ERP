'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Mail, Phone, Lock, ArrowRight } from 'lucide-react'
import { registerSchema, RegisterFormData } from '@/features/auth/auth.schemas'
import { signUpAction, signInWithGoogleAction } from '@/actions/auth.actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') || ''
  const { t, locale } = useI18n()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)

    const res = await signUpAction({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      phone: data.phone,
    })

    if (res.success) {
      const targetUrl = planParam ? `/onboarding?plan=${encodeURIComponent(planParam)}` : '/onboarding'
      window.location.href = targetUrl
    } else {
      setError(res.error || 'Registration failed. Please check your credentials.')
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (isGoogleLoading || isLoading) return
    setIsGoogleLoading(true)
    setError(null)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const callbackUrl = planParam
        ? `${origin}/auth/callback?plan=${encodeURIComponent(planParam)}`
        : `${origin}/auth/callback`

      const res = await signInWithGoogleAction(callbackUrl)
      if (res.success && res.url) {
        window.location.href = res.url
        return
      }

      setError(res.error || 'Failed to initialize Google Sign Up. Please try again.')
    } catch (e: any) {
      setError(e?.message || 'Failed to initialize Google Sign Up')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-xl dark:border-slate-800">
      <CardHeader className="space-y-1 text-left pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          {t('auth.register_title')}
        </CardTitle>
        <CardDescription>{t('auth.register_subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-3.5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-300 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label required>{t('auth.full_name')}</Label>
            <Input
              type="text"
              icon={<User className="h-4 w-4" />}
              placeholder="e.g. Shamsul Alam"
              {...register('fullName')}
              error={errors.fullName?.message}
            />
          </div>

          <div className="space-y-1.5">
            <Label required>{t('auth.phone')}</Label>
            <Input
              type="tel"
              icon={<Phone className="h-4 w-4" />}
              placeholder="01711000000"
              {...register('phone')}
              error={errors.phone?.message}
            />
          </div>

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

          <div className="space-y-1.5">
            <Label required>{t('auth.password')}</Label>
            <Input
              type="password"
              icon={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3.5 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="submit"
            className="w-full justify-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold h-11 text-sm shadow-md"
            isLoading={isLoading}
          >
            <span>{t('auth.sign_up')}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-white px-2.5 text-slate-400 dark:bg-slate-900">
                {locale === 'bn' ? 'অথবা' : 'Or'}
              </span>
            </div>
          </div>

          {/* Google SSO Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
            isLoading={isGoogleLoading}
            disabled={isGoogleLoading || isLoading}
            className="w-full text-xs font-semibold cursor-pointer h-10 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                  ? 'গুগলে পাঠানো হচ্ছে...'
                  : 'Connecting to Google...'
                : locale === 'bn'
                  ? 'গুগল দিয়ে সাইন আপ করুন'
                  : 'Sign up with Google'}
            </span>
          </Button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
            {t('auth.already_account')}{' '}
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {t('auth.sign_in')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
