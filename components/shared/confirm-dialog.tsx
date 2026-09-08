'use client'

import React from 'react'
import { ModalDialog } from './modal-dialog'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useI18n } from '@/i18n/context'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  titleBn?: string
  message: string
  messageBn?: string
  confirmText?: string
  confirmTextBn?: string
  cancelText?: string
  cancelTextBn?: string
  onConfirm: () => void
  isLoading?: boolean
  isDestructive?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  titleBn,
  message,
  messageBn,
  confirmText,
  confirmTextBn,
  cancelText,
  cancelTextBn,
  onConfirm,
  isLoading = false,
  isDestructive = true,
}: ConfirmDialogProps) {
  const { t, tBilingual } = useI18n()

  const displayTitle = tBilingual(title, titleBn)
  const displayMessage = tBilingual(message, messageBn)
  const defaultConfirmText = isDestructive ? t('common.delete') : t('common.confirm')
  const displayConfirm = confirmText
    ? tBilingual(confirmText, confirmTextBn)
    : defaultConfirmText
  const displayCancel = cancelText
    ? tBilingual(cancelText, cancelTextBn)
    : t('common.cancel')

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={displayTitle}
      confirmText={displayConfirm}
      cancelText={displayCancel}
      onConfirm={onConfirm}
      isConfirmLoading={isLoading}
      confirmVariant={isDestructive ? 'destructive' : 'default'}
    >
      <div className="flex items-start gap-3.5 py-2">
        {isDestructive ? (
          <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-500 dark:bg-rose-500/20 border border-rose-500/30 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        ) : (
          <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500 dark:bg-indigo-500/20 border border-indigo-500/30 shrink-0">
            <HelpCircle className="h-5 w-5" />
          </div>
        )}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bangla-text">
          {displayMessage}
        </p>
      </div>
    </ModalDialog>
  )
}
