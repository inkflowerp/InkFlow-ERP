import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-xl border p-3.5 text-xs [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-foreground',
  {
 variants: {
 variant: {
 default: 'bg-background text-foreground border-border',
 destructive:
          'border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive',
 warning:
          'border-warning/30 bg-warning/10 text-warning [&>svg]:text-warning',
 info:
          'border-info/30 bg-info/10 text-info [&>svg]:text-info',
 success:
          'border-success/30 bg-success/10 text-success [&>svg]:text-success',
      },
    },
 defaultVariants: {
 variant: 'default',
    },
  }
)

const Alert = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
 ref={ref}
 role="alert"className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h5
 ref={ref}
 className={cn('mb-1 font-bold leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h5>
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
 ref={ref}
 className={cn('text-xs [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
