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
  style?: React.CSSProperties
  className?: string
}

const SIZE_MAP: Record<ModalDialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-[95vw]',
}

const SIZE_STYLE_MAP: Record<ModalDialogSize, React.CSSProperties> = {
  sm: { maxWidth: '384px', width: '100%' },
  md: { maxWidth: '448px', width: '100%' },
  lg: { maxWidth: '512px', width: '100%' },
  xl: { maxWidth: '576px', width: '100%' },
  '2xl': { maxWidth: '672px', width: '100%' },
  '3xl': { maxWidth: '768px', width: '100%' },
  '4xl': { maxWidth: '896px', width: '100%' },
  '5xl': { maxWidth: '1024px', width: '100%' },
  '6xl': { maxWidth: '1152px', width: '100%' },
  '7xl': { maxWidth: '1280px', width: '100%' },
  full: { maxWidth: '95vw', width: '100%' },
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
  style,
  className,
}: ModalDialogProps) {
  const { t } = useI18n()

  const resolvedMaxWidth = maxWidth || (size ? SIZE_MAP[size] : undefined)
  const resolvedStyle = size ? { ...SIZE_STYLE_MAP[size], ...style } : style

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth={resolvedMaxWidth} style={resolvedStyle}>
      <DialogContent onClose={() => onOpenChange(false)} className={resolvedMaxWidth ? `${resolvedMaxWidth} ${className || ''}` : className} style={resolvedStyle}>
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
