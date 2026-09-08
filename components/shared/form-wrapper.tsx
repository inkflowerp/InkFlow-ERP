'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface FormWrapperProps {
  title: string
  titleBn?: string
  description?: string
  descriptionBn?: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  isLoading?: boolean
  submitText?: string
  submitTextBn?: string
  cancelText?: string
  cancelTextBn?: string
  onCancel?: () => void
  error?: string | null
  className?: string
  headerAction?: React.ReactNode
}

export function FormWrapper({
  title,
  titleBn,
  description,
  descriptionBn,
  children,
  onSubmit,
  isLoading = false,
  submitText,
  submitTextBn,
  cancelText,
  cancelTextBn,
  onCancel,
  error,
  className,
  headerAction,
}: FormWrapperProps) {
  const { t, tBilingual } = useI18n()

  const displayTitle = tBilingual(title, titleBn)
  const displayDescription = description ? tBilingual(description, descriptionBn) : undefined
  const displaySubmit = submitText
    ? tBilingual(submitText, submitTextBn)
    : t('common.save')
  const displayCancel = cancelText
    ? tBilingual(cancelText, cancelTextBn)
    : t('common.cancel')

  return (
    <form onSubmit={onSubmit} className={cn('w-full', className)}>
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white bangla-text">
              {displayTitle}
            </CardTitle>
            {displayDescription && (
              <CardDescription className="mt-1 text-xs text-slate-500 dark:text-slate-400 bangla-text leading-relaxed">
                {displayDescription}
              </CardDescription>
            )}
          </div>
          {headerAction}
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-2.5 animate-in fade-in-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="bangla-text">{error}</span>
            </div>
          )}
          {children}
        </CardContent>

        <CardFooter className="flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-950/20">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="h-10 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800"
            >
              {displayCancel}
            </Button>
          )}
          <Button
            type="submit"
            isLoading={isLoading}
            className="h-10 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 px-5"
          >
            {displaySubmit}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
