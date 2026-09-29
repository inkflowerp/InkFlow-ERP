'use client'

import React, { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react'
import { ColumnDef } from '@/types/common.types'
import { EmptyState } from './empty-state'
import { LoadingState } from './loading-state'
import { PaginationControls } from './pagination-controls'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  isLoading?: boolean
  emptyTitle?: string
  emptyTitleBn?: string
  emptyDescription?: string
  emptyDescriptionBn?: string
  onRowClick?: (row: T) => void
  pagination?: {
    pageIndex: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
  }
}

export function DataTable<T extends Record<string, unknown>>({
  columns = [],
  data = [],
  keyExtractor,
  isLoading = false,
  emptyTitle,
  emptyTitleBn,
  emptyDescription,
  emptyDescriptionBn,
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const { t, tBilingual } = useI18n()

  const safeColumns = Array.isArray(columns) ? columns : []
  const safeData = Array.isArray(data) ? data : []

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey) return safeData
    return [...safeData].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [safeData, sortKey, sortDirection])

  if (isLoading) {
    return <LoadingState variant="table" rows={6} />
  }

  if (safeData.length === 0) {
    return (
      <EmptyState
        title={emptyTitle || t('common.no_data')}
        titleBn={emptyTitleBn}
        description={emptyDescription}
        descriptionBn={emptyDescriptionBn}
      />
    )
  }

  const renderColumnHeader = (col: ColumnDef<T>) => {
    if (typeof col.header === 'string' && col.headerBn) {
      return tBilingual(col.header, col.headerBn)
    }
    return col.header
  }

  return (
    <div className="space-y-4">
      {/* 1. DESKTOP VIEW: Clean Structured Table (hidden on small screens) */}
      <div className="hidden md:block rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-foreground">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                {safeColumns.map((col, idx) => (
                  <th
                    key={String(col.key) || idx}
                    className={cn(
                      'px-4 py-3 whitespace-nowrap',
                      col.sortable && 'cursor-pointer select-none hover:text-foreground',
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="bangla-text">{renderColumnHeader(col)}</span>
                      {col.sortable && (
                        <span className="text-muted-foreground">
                          {sortKey === col.key ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'transition-colors hover:bg-muted/30 h-[48px]',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {safeColumns.map((col, cIdx) => (
                    <td
                      key={String(col.key) || cIdx}
                      className={cn('px-4 py-3 text-xs sm:text-sm text-foreground bangla-text', col.className)}
                    >
                      {col.render ? col.render(row) : String(row[col.key as string] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. MOBILE VIEW: Thumb-Friendly Touch Cards (visible only on small screens) */}
      <div className="md:hidden space-y-2.5">
        {sortedData.map((row) => (
          <div
            key={keyExtractor(row)}
            onClick={() => onRowClick && onRowClick(row)}
            className={cn(
              'p-4 rounded-xl bg-card border border-border shadow-xs space-y-2.5 transition-colors active:scale-[0.99] min-h-[44px]',
              onRowClick && 'cursor-pointer hover:border-primary/40'
            )}
          >
            {/* First Column as Primary Header */}
            {safeColumns.length > 0 && (
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="font-bold text-sm text-foreground bangla-text">
                  {safeColumns[0].render ? safeColumns[0].render(row) : String(row[safeColumns[0].key as string] ?? '')}
                </div>
                {onRowClick && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            )}

            {/* Remaining Columns as Key-Value Pairs */}
            <div className="space-y-1.5 text-xs sm:text-sm">
              {safeColumns.slice(1).map((col, cIdx) => (
                <div key={cIdx} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground font-medium bangla-text">{renderColumnHeader(col)}:</span>
                  <span className="text-foreground font-semibold text-right bangla-text">
                    {col.render ? col.render(row) : String(row[col.key as string] ?? '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <div className="p-2 bg-card rounded-xl border border-border">
          <PaginationControls {...pagination} />
        </div>
      )}
    </div>
  )
}
