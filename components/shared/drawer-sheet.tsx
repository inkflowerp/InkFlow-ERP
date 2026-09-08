'use client'

import React from 'react'
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetFooter,
} from '@/components/ui/sheet'

interface DrawerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  side?: 'left' | 'right'
  footerActions?: React.ReactNode
}

export function DrawerSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = 'right',
  footerActions,
}: DrawerSheetProps) {

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side={side}>
      <SheetHeader onClose={() => onOpenChange(false)}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </SheetHeader>

      <SheetContent>{children}</SheetContent>

      {footerActions && (
        <SheetFooter className="flex items-center justify-end gap-2">
          {footerActions}
        </SheetFooter>
      )}
    </Sheet>
  )
}
