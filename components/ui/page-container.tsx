import React from 'react'
import { cn } from '@/lib/utils'

export type PageContainerSize = 'default' | 'wide' | 'narrow' | 'full'

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: PageContainerSize
  as?: 'main' | 'div' | 'section'
  children: React.ReactNode
}

const sizeClasses: Record<PageContainerSize, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-[1600px]',
  full: 'max-w-none w-full',
}

export function PageContainer({
  size = 'default',
  as: Component = 'div',
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        'w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
