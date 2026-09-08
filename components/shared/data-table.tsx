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
  columns,
  data,
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

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortKey, sortDirection])

  if (isLoading) {
    return <LoadingState variant="table" rows={6} />
  }

  if (!data || data.length === 0) {
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
      <div className="hidden md:block rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={String(col.key) || idx}
                    className={cn(
                      'px-4 py-3.5 whitespace-nowrap',
                      col.sortable && 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200',
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{renderColumnHeader(col)}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {sortKey === col.key ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sortedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={String(col.key) || cIdx}
                      className={cn('px-4 py-3.5 text-slate-700 dark:text-slate-300', col.className)}
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
              'p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5 transition-all active:scale-[0.99]',
              onRowClick && 'cursor-pointer hover:border-indigo-500/40'
            )}
          >
            {/* First Column as Primary Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {columns[0].render ? columns[0].render(row) : String(row[columns[0].key as string] ?? '')}
              </div>
              {onRowClick && (
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              )}
            </div>

            {/* Remaining Columns as Key-Value Pairs */}
            <div className="space-y-1.5 text-xs">
              {columns.slice(1).map((col, cIdx) => (
                <div key={cIdx} className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-medium">{renderColumnHeader(col)}:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold text-right">
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
        <div className="p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <PaginationControls {...pagination} />
        </div>
      )}
    </div>
  )
}
