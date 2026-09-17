'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

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
  onSubmit?: (e: React.FormEvent) => void
  isConfirmLoading?: boolean
  confirmVariant?: 'default' | 'destructive' | 'cmyk'
  hideFooter?: boolean
  footer?: React.ReactNode
  maxWidth?: string
  size?: ModalDialogSize
  style?: React.CSSProperties
  className?: string
  bodyClassName?: string
  headerClassName?: string
  footerClassName?: string
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
  onSubmit,
  isConfirmLoading = false,
  confirmVariant = 'default',
  hideFooter = false,
  footer,
  maxWidth,
  size,
  style,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
}: ModalDialogProps) {
  const { t } = useI18n()

  const resolvedMaxWidth = maxWidth || (size ? SIZE_MAP[size] : undefined)
  const resolvedStyle = size ? { ...SIZE_STYLE_MAP[size], ...style } : style

  const dialogInner = (
    <>
      {/* FIXED HEADER */}
      <DialogHeader className={headerClassName}>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
      </DialogHeader>

      {/* SCROLLABLE BODY */}
      <DialogBody className={bodyClassName}>
        {children}
      </DialogBody>

      {/* FIXED FOOTER */}
      {footer ? (
        <div className={cn('shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xs z-20', footerClassName)}>
          {footer}
        </div>
      ) : !hideFooter ? (
        <DialogFooter className={footerClassName}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirmLoading}
            className="cursor-pointer"
          >
            {cancelText || t('common.cancel')}
          </Button>
          {(onConfirm || onSubmit) && (
            <Button
              type={onSubmit ? 'submit' : 'button'}
              variant={confirmVariant}
              onClick={onConfirm}
              isLoading={isConfirmLoading}
              className="cursor-pointer"
            >
              {confirmText || t('common.confirm')}
            </Button>
          )}
        </DialogFooter>
      ) : null}
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth={resolvedMaxWidth} style={resolvedStyle}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className={cn('flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] overflow-hidden p-0', resolvedMaxWidth, className)}
        style={resolvedStyle}
      >
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
            {dialogInner}
          </form>
        ) : (
          dialogInner
        )}
      </DialogContent>
    </Dialog>
  )
}
