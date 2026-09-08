import { ReactNode } from 'react'

export type LocaleMode = 'en' | 'bn'

export interface ColumnDef<T> {
  key: keyof T | string
  header: string | ReactNode
  headerBn?: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  className?: string
}

export interface PaginationState {
  pageIndex: number
  pageSize: number
  totalCount: number
}

export interface FilterOption {
  label: string
  labelBn?: string
  value: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
