'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useI18n } from '@/i18n/context'
import { toBengaliNumerals } from '@/lib/formatters'

interface PaginationControlsProps {
  pageIndex: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export function PaginationControls({
  pageIndex,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationControlsProps) {
  const { locale, tBilingual } = useI18n()
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startItem = totalCount === 0 ? 0 : pageIndex * pageSize + 1
  const endItem = Math.min((pageIndex + 1) * pageSize, totalCount)

  const num = (val: number) => (locale === 'bn' ? toBengaliNumerals(val) : val)

  const itemsText = (() => {
    if (locale === 'en') {
      return `${startItem} - ${endItem} of ${totalCount} items`
    }
    if (locale === 'bn') {
      return `${toBengaliNumerals(startItem)} - ${toBengaliNumerals(endItem)} / মোট ${toBengaliNumerals(totalCount)} টি`
    }
    return `${startItem} - ${endItem} of ${totalCount} items (${toBengaliNumerals(startItem)} - ${toBengaliNumerals(endItem)} / মোট ${toBengaliNumerals(totalCount)} টি)`
  })()

  const rowsLabel = tBilingual('Rows:', 'প্রতি পৃষ্ঠায়:')

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-slate-600 dark:text-slate-400">
      <div className="flex items-center gap-2">
        <span>{itemsText}</span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-4">
            <span className="text-xs">{rowsLabel}</span>
            <Select
              className="h-8 w-18 text-xs py-1"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {num(size)}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 min-h-[36px] cursor-pointer"
          onClick={() => onPageChange(0)}
          disabled={pageIndex === 0}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 min-h-[36px] cursor-pointer"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex === 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-3 text-xs font-semibold select-none">
          {num(pageIndex + 1)} / {num(totalPages)}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 min-h-[36px] cursor-pointer"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= totalPages - 1}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 min-h-[36px] cursor-pointer"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={pageIndex >= totalPages - 1}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
