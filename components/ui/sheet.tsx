'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  side?: 'left' | 'right'
  className?: string
}

export function Sheet({ open, onOpenChange, children, side = 'left', className }: SheetProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

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

  if (!open || !mounted) return null

  const sheetNode = (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900 transition-opacity animate-in fade-in-0 duration-150"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Sheet panel */}
      <div
        className={cn(
          'fixed inset-y-0 z-[100] flex h-full h-[100dvh] max-h-screen w-[88vw] sm:w-80 max-w-sm flex-col min-h-0 border-border bg-card text-card-foreground shadow-xl transition-transform animate-in duration-300 overflow-hidden',
          side === 'left' ? 'left-0 border-r slide-in-from-left' : 'right-0 border-l slide-in-from-right',
          className
        )}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(sheetNode, document.body)
}

export function SheetHeader({
  className,
  onClose,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div
      className={cn('flex items-center justify-between border-b border-border p-4 sm:p-5 bg-card text-card-foreground shrink-0 min-h-[56px]', className)}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export function SheetContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4 scrollbar-thin bg-card text-card-foreground', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-border p-3.5 sm:p-4 bg-card text-card-foreground shrink-0', className)} {...props} />
}
