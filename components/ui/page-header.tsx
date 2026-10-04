'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumb?: React.ReactNode
  primaryAction?: React.ReactNode
  secondaryActions?: React.ReactNode
  badge?: React.ReactNode
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  primaryAction,
  secondaryActions,
  badge,
  icon,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground p-5 sm:p-6 rounded-xl border border-border shadow-xs space-y-4 relative',
        className
      )}
      {...props}
    >
      {breadcrumb && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
          {breadcrumb}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {icon && (
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              {React.isValidElement(icon) ? (
                icon
              ) : (
                React.createElement(icon as React.ComponentType<{ className?: string }>, {
                  className: 'h-5 w-5 sm:h-6 sm:w-6',
                })
              )}
            </div>
          )}

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground bangla-text line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {(primaryAction || secondaryActions) && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto justify-start md:justify-end">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
    </div>
  )
}
