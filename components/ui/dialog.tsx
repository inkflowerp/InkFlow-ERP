'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  maxWidth?: string
  style?: React.CSSProperties
}

export function Dialog({ open, onOpenChange, children, className, maxWidth, style }: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      {/* Content Container */}
      <div
        style={style}
        className={cn(
          'relative z-50 w-full my-auto max-h-[calc(100dvh-2rem)] flex flex-col animate-in fade-in-0 zoom-in-95',
          maxWidth || 'max-w-lg',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function DialogContent({
  className,
  children,
  onClose,
  style,
}: {
  className?: string
  children: React.ReactNode
  onClose?: () => void
  style?: React.CSSProperties
}) {
  return (
    <div
      style={style}
      className={cn(
        'relative w-full max-h-[calc(100dvh-2.5rem)] flex flex-col rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl transition-all overflow-hidden dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 z-20 rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 overscroll-contain">
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-left mb-3 sm:mb-4 shrink-0', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base sm:text-lg font-semibold leading-tight tracking-tight text-slate-900 dark:text-white', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs sm:text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0',
        className
      )}
      {...props}
    />
  )
}
