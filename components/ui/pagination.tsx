'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
  ...props
}: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null

  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-2 text-xs text-muted-foreground w-full',
        className
      )}
      {...props}
    >
      <div>
        {totalItems !== undefined && pageSize !== undefined && (
          <span className="tabular-nums">
            Showing{' '}
            <strong className="text-foreground">
              {Math.min((page - 1) * pageSize + 1, totalItems)}
            </strong>{' '}
            to{' '}
            <strong className="text-foreground">
              {Math.min(page * pageSize, totalItems)}
            </strong>{' '}
            of <strong className="text-foreground">{totalItems}</strong> entries
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 select-none">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          aria-label="First page"
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
          className="h-8 px-2.5 gap-1 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <span className="px-2 font-medium text-foreground tabular-nums">
          Page {page} of {totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label="Next page"
          className="h-8 px-2.5 gap-1 text-xs"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          aria-label="Last page"
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
