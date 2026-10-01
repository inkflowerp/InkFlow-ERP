'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownMenuContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.RefObject<HTMLDivElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const isInsideTrigger = triggerRef.current?.contains(target)
      const isInsideContent = contentRef.current?.contains(target)

      if (!isInsideTrigger && !isInsideContent) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div ref={triggerRef} className="relative inline-block text-left">
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
    const childElement = children as React.ReactElement<any>
    return React.cloneElement(childElement, {
      onClick: (e: React.MouseEvent) => {
        if (childElement.props.onClick) {
          childElement.props.onClick(e)
        }
        handleClick(e)
      },
    })
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  )
}

interface Coords {
  top?: number
  bottom?: number
  left?: number
  right?: number
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
  const [mounted, setMounted] = React.useState(false)
  const [coords, setCoords] = React.useState<Coords>({})

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const calculatePosition = React.useCallback(() => {
    if (!ctx?.triggerRef.current) return

    const rect = ctx.triggerRef.current.getBoundingClientRect()
    const windowHeight = window.innerHeight
    const windowWidth = window.innerWidth

    // Auto-close if trigger element scrolled outside viewport
    if (rect.bottom < 0 || rect.top > windowHeight) {
      ctx.setOpen(false)
      return
    }

    const estimatedHeight = 220
    const spaceBelow = windowHeight - rect.bottom
    const spaceAbove = rect.top
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow

    const nextCoords: Coords = {}

    if (openUp) {
      nextCoords.bottom = Math.max(8, windowHeight - rect.top + 4)
    } else {
      nextCoords.top = Math.max(8, rect.bottom + 4)
    }

    if (align === 'start') {
      nextCoords.left = Math.max(8, Math.min(rect.left, windowWidth - 180))
    } else if (align === 'center') {
      nextCoords.left = Math.max(8, rect.left + rect.width / 2)
    } else {
      // align === 'end'
      nextCoords.right = Math.max(8, windowWidth - rect.right)
    }

    setCoords(nextCoords)
  }, [align, ctx])

  React.useEffect(() => {
    if (!ctx?.open) return

    calculatePosition()

    const handleScrollOrResize = () => {
      calculatePosition()
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [ctx?.open, calculatePosition])

  if (!mounted || !ctx || !ctx.open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={ctx.contentRef}
      style={{
        position: 'fixed',
        top: coords.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        left: coords.left !== undefined ? `${coords.left}px` : undefined,
        right: coords.right !== undefined ? `${coords.right}px` : undefined,
        transform: align === 'center' ? 'translateX(-50%)' : undefined,
        zIndex: 99999,
      }}
      className={cn(
        'min-w-[10rem] max-h-[min(360px,calc(100vh-24px))] overflow-y-auto rounded-xl border border-border bg-card p-1 text-foreground shadow-xl animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>,
    document.body
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
    const childElement = children as React.ReactElement<any>
    return React.cloneElement(childElement, {
      onClick: (e: React.MouseEvent) => {
        if (childElement.props.onClick) {
          childElement.props.onClick(e)
        }
        handleClick(e)
      },
      className: cn(
        'flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors hover:bg-muted hover:text-foreground text-left',
        childElement.props.className,
        className
      ),
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors hover:bg-muted hover:text-foreground text-left',
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} />
}
