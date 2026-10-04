import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-xs bangla-text select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
        secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-muted shadow-xs',
        outline: 'border border-input bg-card text-foreground hover:bg-muted',
        ghost: 'shadow-none text-foreground hover:bg-muted',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs',
        success: 'bg-success text-success-foreground hover:bg-success/90 shadow-xs',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-xs',
        link: 'text-primary underline-offset-4 hover:underline shadow-none p-0 h-auto font-medium',
        gradient: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
        subtle: 'bg-muted text-foreground hover:bg-muted/80 shadow-none font-medium',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm min-h-[40px]',
        xs: 'h-7.5 rounded-md px-2.5 text-xs',
        sm: 'h-9 rounded-lg px-3 text-xs min-h-[36px]',
        md: 'h-9.5 rounded-lg px-3.5 text-xs sm:text-sm min-h-[38px]',
        lg: 'h-11 rounded-lg px-5 text-sm sm:text-base min-h-[44px]',
        icon: 'h-9 w-9 p-0 rounded-lg min-h-[36px] min-w-[36px]',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg min-h-[32px] min-w-[32px]',
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

    // Accessibility check: Icon-only buttons should have aria-label
    const isIconOnly = size === 'icon' || size === 'icon-sm' || size === 'icon-xs'
    if (isIconOnly && !props['aria-label'] && typeof children !== 'string') {
      // In development, warn if aria-label is missing on icon button
      if (process.env.NODE_ENV !== 'production' && !props['aria-labelledby']) {
        console.warn('Icon-only Button component is missing an accessible aria-label')
      }
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
