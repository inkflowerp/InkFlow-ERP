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
  sm: 'w-[95vw] max-w-sm',
  md: 'w-[95vw] max-w-md',
  lg: 'w-[95vw] max-w-lg',
  xl: 'w-[95vw] max-w-xl',
  '2xl': 'w-[95vw] max-w-2xl',
  '3xl': 'w-[95vw] max-w-3xl',
  '4xl': 'w-[95vw] max-w-4xl',
  '5xl': 'w-[95vw] max-w-5xl',
  '6xl': 'w-[95vw] max-w-6xl',
  '7xl': 'w-[95vw] max-w-7xl',
  full: 'w-[95vw] max-w-[95vw]',
}

const SIZE_STYLE_MAP: Record<ModalDialogSize, React.CSSProperties> = {
  sm: { width: '95vw', maxWidth: '384px' },
  md: { width: '95vw', maxWidth: '448px' },
  lg: { width: '95vw', maxWidth: '512px' },
  xl: { width: '95vw', maxWidth: '576px' },
  '2xl': { width: '95vw', maxWidth: '672px' },
  '3xl': { width: '95vw', maxWidth: '768px' },
  '4xl': { width: '95vw', maxWidth: '896px' },
  '5xl': { width: '95vw', maxWidth: '1024px' },
  '6xl': { width: '95vw', maxWidth: '1152px' },
  '7xl': { width: '95vw', maxWidth: '1280px' },
  full: { width: '95vw', maxWidth: '95vw' },
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
