import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const textareaElement = (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-xs bangla-text',
          error && 'border-destructive focus:ring-destructive focus-visible:ring-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (!error) {
      return textareaElement
    }

    return (
      <div className="w-full">
        {textareaElement}
        <p className="mt-1 text-xs text-destructive font-medium">{error}</p>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
