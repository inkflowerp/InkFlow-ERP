import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-xs bangla-text select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs',
        outline: 'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'shadow-none text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline shadow-none p-0 h-auto font-semibold',
        gradient: 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xs shadow-blue-500/20 active:scale-[0.98]',
        success: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-xs shadow-emerald-500/20 active:scale-[0.98]',
        warning: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold shadow-xs shadow-amber-500/20 active:scale-[0.98]',
        subtle: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 shadow-none font-medium',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        xs: 'h-7 rounded-md px-2.5 text-xs',
        sm: 'h-8.5 rounded-lg px-3 text-xs',
        md: 'h-9.5 rounded-lg px-3.5 text-xs sm:text-sm',
        lg: 'h-11 rounded-xl px-6 text-base',
        icon: 'h-9 w-9 p-0 rounded-lg',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg',
        'icon-xs': 'h-7 w-7 p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, asChild = false, children, disabled, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>
      return React.cloneElement(child, {
        className: cn(buttonVariants({ variant, size, className }), child.props.className),
        ...props,
      } as React.HTMLAttributes<HTMLElement>)
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />}
        <span
          className={cn('inline-flex items-center gap-2', isLoading && 'opacity-70')}
          aria-busy={isLoading}
          aria-live={isLoading ? 'polite' : undefined}
        >
          {children}
        </span>
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
