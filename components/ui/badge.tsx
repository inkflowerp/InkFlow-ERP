import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bangla-text select-none shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border border-destructive/30 bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-rose-300 hover:bg-destructive/25',
        outline: 'border border-border text-foreground',
        success: 'border border-success/30 bg-success/15 text-success dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80 hover:bg-success/20',
        warning: 'border border-warning/30 bg-warning/15 text-warning dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80 hover:bg-warning/20',
        info: 'border border-info/30 bg-info/15 text-info dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/80 hover:bg-info/20',
        purple: 'border border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20',
        gradient: 'border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs',
        cyan: 'border border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20',
        magenta: 'border border-pink-500/30 bg-pink-500/15 text-pink-700 dark:text-pink-300 hover:bg-pink-500/20',
        neutral: 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        xs: 'px-1.5 py-0 text-3xs font-bold tracking-tight h-4',
        sm: 'px-2 py-0.5 text-2xs font-bold tracking-tight',
        lg: 'px-3 py-1 text-sm font-semibold',
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
