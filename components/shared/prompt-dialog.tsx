'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from './modal-dialog'
import { MessageSquare } from 'lucide-react'
import { useI18n } from '@/i18n/context'

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  titleBn?: string
  message: string
  messageBn?: string
  placeholder?: string
  placeholderBn?: string
  initialValue?: string
  confirmText?: string
  confirmTextBn?: string
  cancelText?: string
  cancelTextBn?: string
  onConfirm: (value: string) => void | Promise<void>
  isLoading?: boolean
  multiline?: boolean
  required?: boolean
}

export function PromptDialog({
  open,
  onOpenChange,
  title,
  titleBn,
  message,
  messageBn,
  placeholder,
  placeholderBn,
  initialValue = '',
  confirmText,
  confirmTextBn,
  cancelText,
  cancelTextBn,
  onConfirm,
  isLoading = false,
  multiline = true,
  required = false,
}: PromptDialogProps) {
  const { t, tBilingual } = useI18n()
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (open) {
      setValue(initialValue)
    }
  }, [open, initialValue])

  const displayTitle = tBilingual(title, titleBn)
  const displayMessage = tBilingual(message, messageBn)
  const displayPlaceholder = placeholder
    ? tBilingual(placeholder, placeholderBn)
    : tBilingual('Enter details...', 'বিস্তারিত লিখুন...')
  const displayConfirm = confirmText
    ? tBilingual(confirmText, confirmTextBn)
    : t('common.submit') || 'Submit'
  const displayCancel = cancelText
    ? tBilingual(cancelText, cancelTextBn)
    : t('common.cancel')

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (required && !value.trim()) return
    onConfirm(value.trim())
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={displayTitle}
      confirmText={displayConfirm}
      cancelText={displayCancel}
      onConfirm={handleSubmit}
      isConfirmLoading={isLoading}
      confirmVariant="default"
    >
      <div className="space-y-3 py-2">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-indigo-500/10 p-2.5 text-indigo-500 dark:bg-indigo-500/20 border border-indigo-500/30 shrink-0 mt-0.5">
            <MessageSquare className="h-4 w-4" />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bangla-text">
            {displayMessage}
          </p>
        </div>

        <div>
          {multiline ? (
            <textarea
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={displayPlaceholder}
              autoFocus
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={displayPlaceholder}
              autoFocus
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          )}
        </div>
      </div>
    </ModalDialog>
  )
}
