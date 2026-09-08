'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Mail, Phone, Lock, ArrowRight } from 'lucide-react'
import { registerSchema, RegisterFormData } from '@/features/auth/auth.schemas'
import { signUpAction } from '@/actions/auth.actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useI18n()

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
      router.push('/onboarding')
    } else {
      setError(res.error || 'Registration failed. Please check your credentials.')
    }
    setIsLoading(false)
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

        <CardFooter className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="submit"
            className="w-full justify-center gap-2"
            isLoading={isLoading}
          >
            <span>{t('auth.sign_up')}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
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
