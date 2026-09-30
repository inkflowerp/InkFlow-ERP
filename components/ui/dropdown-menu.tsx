'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={menuRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children: React.ReactNode
}) {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) return null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    ctx.setOpen((prev) => !prev)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
    })
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  align = 'end',
  className,
  children,
}: {
  align?: 'start' | 'end' | 'center'
  className?: string
  children: React.ReactNode
}) {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx || !ctx.open) return null

  const alignClass =
    align === 'start'
      ? 'left-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-0'

  return (
    <div
      className={cn(
        'absolute z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-slate-900 shadow-lg animate-in fade-in-0 zoom-in-95',
        alignClass,
        className
      )}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({
  onClick,
  className,
  asChild,
  children,
}: {
  onClick?: () => void
  className?: string
  asChild?: boolean
  children: React.ReactNode
}) {
  const ctx = React.useContext(DropdownMenuContext)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick) onClick()
    ctx?.setOpen(false)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      className: cn(
        'flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900',
        className
      ),
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 text-left',
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('-mx-1 my-1 h-px bg-slate-100', className)} />
}
