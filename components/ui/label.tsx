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
          'text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 leading-normal select-none',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 font-bold">*</span>}
      </label>
    )
  }
)
Label.displayName = 'Label'

export { Label }
