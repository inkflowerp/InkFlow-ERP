import * as React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export type TableDensity = 'compact' | 'default' | 'comfortable'

const TableContext = React.createContext<{ density: TableDensity }>({ density: 'default' })

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  density?: TableDensity
  stickyHeader?: boolean
  containerClassName?: string
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, density = 'default', stickyHeader = false, ...props }, ref) => (
    <TableContext.Provider value={{ density }}>
      <div className={cn('relative w-full overflow-x-auto rounded-xl border border-border bg-card shadow-xs', containerClassName)}>
        <table
          ref={ref}
          className={cn(
            'w-full caption-bottom text-sm text-foreground tabular-nums text-left border-collapse',
            className
          )}
          {...props}
        />
      </div>
    </TableContext.Provider>
  )
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }
>(({ className, sticky = false, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'bg-muted/60 text-muted-foreground border-b border-border font-medium',
      sticky && 'sticky top-0 z-10 backdrop-blur-xs bg-muted/80',
      className
    )}
    {...props}
  />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0 divide-y divide-border/60', className)}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t border-border bg-muted/50 font-medium text-foreground [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border/60 transition-colors hover:bg-muted/40 data-[state=selected]:bg-primary/5',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const { density } = React.useContext(TableContext)
  const pad =
    density === 'compact'
      ? 'px-3 py-2 text-xs'
      : density === 'comfortable'
      ? 'px-5 py-3.5 text-xs sm:text-sm'
      : 'px-4 py-3 text-xs'

  return (
    <th
      ref={ref}
      className={cn(
        'font-semibold text-muted-foreground uppercase tracking-wider text-left align-middle select-none',
        pad,
        className
      )}
      {...props}
    />
  )
})
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const { density } = React.useContext(TableContext)
  const pad =
    density === 'compact'
      ? 'px-3 py-2 text-xs'
      : density === 'comfortable'
      ? 'px-5 py-3.5 text-sm'
      : 'px-4 py-3 text-sm'

  return (
    <td
      ref={ref}
      className={cn('align-middle text-foreground font-normal leading-snug', pad, className)}
      {...props}
    />
  )
})
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-xs text-muted-foreground', className)}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'

export function TableSkeletonRows({
  columns = 5,
  rows = 5,
}: {
  columns?: number
  rows?: number
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <TableRow key={`skel-row-${rIdx}`}>
          {Array.from({ length: columns }).map((_, cIdx) => (
            <TableCell key={`skel-cell-${rIdx}-${cIdx}`}>
              <Skeleton className="h-4 w-full max-w-[120px] rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
