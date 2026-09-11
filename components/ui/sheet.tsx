'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  side?: 'left' | 'right'
  className?: string
}

export function Sheet({ open, onOpenChange, children, side = 'right', className }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Sheet panel */}
      <div
        className={cn(
          'fixed inset-y-0 z-50 flex h-full h-[100dvh] max-h-screen w-[88vw] sm:w-80 max-w-sm flex-col min-h-0 border-slate-200 bg-white shadow-2xl transition-transform animate-in duration-300 dark:border-slate-800 dark:bg-slate-900 overflow-hidden',
          side === 'left' ? 'left-0 border-r slide-in-from-left' : 'right-0 border-l slide-in-from-right',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({
  className,
  onClose,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div
      className={cn('flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-3.5 sm:p-4 bg-white dark:bg-slate-900 shrink-0 min-h-[56px]', className)}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 active:scale-95 transition-all"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export function SheetContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4 scrollbar-thin bg-white dark:bg-slate-900', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-slate-100 dark:border-slate-800 p-3.5 sm:p-4 bg-white dark:bg-slate-900 shrink-0', className)} {...props} />
}
