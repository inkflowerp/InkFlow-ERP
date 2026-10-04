'use client'

import React from 'react'
import { Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export interface FiltersBarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchSlot?: React.ReactNode
  filtersSlot?: React.ReactNode
  actionsSlot?: React.ReactNode
  onClearFilters?: () => void
  hasActiveFilters?: boolean
  totalResults?: number
}

export function FiltersBar({
  searchSlot,
  filtersSlot,
  actionsSlot,
  onClearFilters,
  hasActiveFilters = false,
  totalResults,
  className,
  children,
  ...props
}: FiltersBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-border bg-card shadow-xs',
        className
      )}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {searchSlot && <div className="w-full sm:w-auto sm:min-w-[240px] max-w-sm">{searchSlot}</div>}
        {filtersSlot}
        {hasActiveFilters && onClearFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            <span>Clear filters</span>
          </Button>
        )}
      </div>

      {(actionsSlot || totalResults !== undefined || children) && (
        <div className="flex items-center gap-2.5 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-border">
          {totalResults !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">
              <strong>{totalResults}</strong> items
            </span>
          )}
          {actionsSlot}
          {children}
        </div>
      )}
    </div>
  )
}
