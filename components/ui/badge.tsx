import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bangla-text select-none shrink-0',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary',
        secondary: 'border-border bg-muted text-foreground',
        destructive: 'border-danger-border bg-danger-surface text-danger',
        danger: 'border-danger-border bg-danger-surface text-danger',
        outline: 'border-border bg-transparent text-foreground',
        success: 'border-success-border bg-success-surface text-success',
        warning: 'border-warning-border bg-warning-surface text-warning',
        info: 'border-info-border bg-info-surface text-info',
        purple: 'border-primary/20 bg-primary/10 text-primary',
        gradient: 'border-primary/20 bg-primary/10 text-primary',
        cyan: 'border-info-border bg-info-surface text-info',
        magenta: 'border-danger-border bg-danger-surface text-danger',
        neutral: 'border-border bg-muted text-muted-foreground',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs min-h-[22px]',
        xs: 'px-2 py-0.5 text-xs font-semibold min-h-[20px]',
        sm: 'px-2 py-0.5 text-xs font-semibold min-h-[22px]',
        lg: 'px-3 py-1 text-sm font-semibold min-h-[26px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
