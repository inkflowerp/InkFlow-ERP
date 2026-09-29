import * as React from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1 leading-normal select-none bangla-text',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-destructive font-bold">*</span>}
      </label>
    )
  }
)
Label.displayName = 'Label'

export { Label }
