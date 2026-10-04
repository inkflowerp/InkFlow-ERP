import React from 'react'
import { AlertTriangle, RefreshCw, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export interface ErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  message?: React.ReactNode
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this view.',
  icon: Icon = AlertTriangle,
  onRetry,
  retryLabel = 'Try Again',
  className,
  children,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-danger-border bg-danger-surface text-card-foreground space-y-4 my-4',
        className
      )}
      {...props}
    >
      <div className="h-12 w-12 rounded-full bg-danger-surface border border-danger-border flex items-center justify-center text-danger">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-semibold text-danger tracking-tight">
          {title}
        </h3>
        {message && (
          <p className="text-xs sm:text-sm text-muted-foreground bangla-text">
            {message}
          </p>
        )}
      </div>

      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-2 border-danger-border text-danger hover:bg-danger/10">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{retryLabel}</span>
        </Button>
      )}

      {children}
    </div>
  )
}
