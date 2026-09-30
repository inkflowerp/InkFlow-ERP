import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  rightElement?: React.ReactNode
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, rightElement, error, ...props }, ref) => {
    const inputElement = (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-xs bangla-text',
          icon && 'pl-10',
          rightElement && 'pr-10',
          error && 'border-destructive focus:ring-destructive focus-visible:ring-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (!icon && !rightElement && !error) {
      return inputElement
    }

    return (
      <div className="relative w-full">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            {icon}
          </div>
        )}
        {inputElement}
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 z-10">
            {rightElement}
          </div>
        )}
        {error && <p className="mt-1 text-xs text-destructive font-medium">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
