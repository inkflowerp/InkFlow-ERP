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
  size?: 'sm' | 'md' | 'lg' | 'xl'
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className={maxWidth}>
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
