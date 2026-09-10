'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export type ModalDialogSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | 'full'

interface ModalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  isConfirmLoading?: boolean
  confirmVariant?: 'default' | 'destructive' | 'cmyk'
  hideFooter?: boolean
  maxWidth?: string
  size?: ModalDialogSize
}

const SIZE_MAP: Record<ModalDialogSize, string> = {
  sm: 'max-w-sm sm:max-w-sm',
  md: 'max-w-md sm:max-w-md',
  lg: 'max-w-lg sm:max-w-lg',
  xl: 'max-w-xl sm:max-w-xl',
  '2xl': 'max-w-2xl sm:max-w-2xl',
  '3xl': 'max-w-3xl sm:max-w-3xl',
  '4xl': 'max-w-4xl sm:max-w-4xl',
  '5xl': 'max-w-5xl sm:max-w-5xl',
  '6xl': 'max-w-6xl sm:max-w-6xl',
  '7xl': 'max-w-7xl sm:max-w-7xl',
  full: 'max-w-[95vw] sm:max-w-[95vw]',
}

export function ModalDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmText,
  cancelText,
  onConfirm,
  isConfirmLoading = false,
  confirmVariant = 'default',
  hideFooter = false,
  maxWidth,
  size,
}: ModalDialogProps) {
  const { t } = useI18n()

  const resolvedMaxWidth = maxWidth || (size ? SIZE_MAP[size] : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth={resolvedMaxWidth}>
      <DialogContent onClose={() => onOpenChange(false)} className={resolvedMaxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="py-2">{children}</div>

        {!hideFooter && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isConfirmLoading}
            >
              {cancelText || t('common.cancel')}
            </Button>
            {onConfirm && (
              <Button
                variant={confirmVariant}
                onClick={onConfirm}
                isLoading={isConfirmLoading}
              >
                {confirmText || t('common.confirm')}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
