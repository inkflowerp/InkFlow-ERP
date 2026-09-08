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
} from 'lucide-react'
import { loginSchema, LoginFormData } from '@/features/auth/auth.schemas'
import { signInAction } from '@/actions/auth.actions'
import { GoogleOAuthProvider } from '@/lib/auth/auth-providers'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()

  useEffect(() => {
    const errParam = searchParams.get('error')
    if (errParam === 'disabled') {
      setError('Your account has been disabled by your administrator. Row Level Security has revoked all access to company records.')
    } else if (errParam === 'unauthorized') {
      setError('You are not authorized to access that portal with your current account.')
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const performLogin = async (email: string, pass: string) => {
    setIsLoading(true)
    setError(null)

    const res = await signInAction(email, pass)
    if (res.success && res.data) {
      const targetSlug = res.data.session.companySlug || 'default'
      const paramRedirect = searchParams.get('redirectTo')

      // Only preserve redirectTo if it belongs to the authenticated company or is a non-tenant route
      let destination = `/${targetSlug}/dashboard`
      if (paramRedirect) {
        if (paramRedirect.startsWith(`/${targetSlug}`)) {
          destination = paramRedirect
        } else if (
          paramRedirect.startsWith('/settings') ||
          paramRedirect.startsWith('/profile') ||
          paramRedirect.startsWith('/notifications')
        ) {
          destination = paramRedirect
        }
      }

      // Hard redirect to force HTTP request headers to include the updated tenant session cookie
      window.location.href = destination
    } else {
      setError(res.error || 'Invalid email or password')
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    await performLogin(data.email, data.password)
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    const provider = new GoogleOAuthProvider()
    const res = await provider.signInWithGoogle()
    if (!res.success && res.error) {
      setError('Google OAuth provider configured. Connect active Google Client ID in Supabase to enable.')
    }
    setIsGoogleLoading(false)
  }

  return (
    <Card className="border-slate-200/80 shadow-xl dark:border-slate-800">
      <CardHeader className="space-y-1 text-left pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold tracking-tight">
            {t('auth.login_title')}
          </CardTitle>
          <span className="text-[11px] font-semibold text-slate-400">Secure Access</span>
        </div>
        <CardDescription>{t('auth.login_subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4 pt-2">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label required>{t('auth.email')}</Label>
            <Input
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              icon={<Mail className="h-4 w-4" />}
              placeholder="owner@yourprintshop.com"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label required>{t('auth.password')}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 py-1"
              >
                {t('auth.forgot_password')}
              </Link>
            </div>
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              icon={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold cursor-pointer h-11 text-sm shadow-md"
            isLoading={isLoading}
          >
            <span>{t('auth.sign_in')}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-slate-500 dark:bg-slate-900">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            isLoading={isGoogleLoading}
            className="w-full text-xs font-semibold cursor-pointer h-10"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
            Google Workspace Login
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2 text-center text-xs text-slate-600 dark:text-slate-400">
          <div>
            {t('auth.no_account')}{' '}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 py-1"
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
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading login...</div>}>
      <LoginForm />
    </Suspense>
  )
}

