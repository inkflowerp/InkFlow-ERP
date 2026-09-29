'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogContextValue {
  titleId: string
  contentRef: React.RefObject<HTMLDivElement | null>
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  maxWidth?: string
  style?: React.CSSProperties
}

export function Dialog({ open, onOpenChange, children, className, maxWidth, style }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)
  const titleId = React.useId()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const previousActiveElement = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!open) return

    previousActiveElement.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    // Focus first interactive element or the container
    const timer = setTimeout(() => {
      if (contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length > 0) {
          focusable[0].focus()
        } else {
          contentRef.current.focus()
        }
      }
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
        return
      }

      if (e.key === 'Tab' && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const firstElement = focusable[0]
        const lastElement = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus()
      }
    }
  }, [open, onOpenChange])

  if (!open || !mounted) return null

  const modalNode = (
    <DialogContext.Provider value={{ titleId, contentRef }}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 xs:p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop: rgba(15,23,42,.45) with no blur */}
        <div
          className="fixed inset-0 bg-slate-900/45 dark:bg-slate-950/65 transition-opacity animate-in fade-in-0"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        {/* Content Container */}
        <div
          style={style}
          className={cn(
            'relative z-[100] w-[95vw] sm:w-full my-auto max-h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95',
            maxWidth || 'max-w-lg',
            className
          )}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  )

  return createPortal(modalNode, document.body)
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
  const context = React.useContext(DialogContext)

  return (
    <div
      ref={context?.contentRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={context?.titleId}
      style={style}
      className={cn(
        'relative w-full max-h-[90vh] flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-xl transition-all overflow-hidden outline-none',
        className
      )}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 z-30 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col space-y-1.5 text-left shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border bg-card z-20 pr-12',
        className
      )}
      {...props}
    />
  )
}

export function DialogBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogTitle({ className, id, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const context = React.useContext(DialogContext)
  return (
    <h2
      id={id || context?.titleId}
      className={cn('text-base sm:text-lg font-bold leading-snug tracking-tight text-foreground bangla-text', className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border bg-muted/40 z-20 mt-0',
        className
      )}
      {...props}
    />
  )
}
