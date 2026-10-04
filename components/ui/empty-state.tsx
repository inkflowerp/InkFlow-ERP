import React from 'react'
import { FolderOpen, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon | React.ComponentType<{ className?: string }>
  }
}

export function EmptyState({
  title,
  description,
  icon: Icon = FolderOpen,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-border bg-card/50 text-card-foreground space-y-4 my-4',
        className
      )}
      {...props}
    >
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-semibold text-foreground tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground bangla-text">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Button onClick={action.onClick} variant="default" size="sm" className="mt-2">
          {action.icon && <action.icon className="h-4 w-4" />}
          <span>{action.label}</span>
        </Button>
      )}

      {children}
    </div>
  )
}
