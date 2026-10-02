import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
 error?: string
 containerClassName?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (rawProps, ref) => {
 const { className, error, containerClassName, ...props } = rawProps
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

    // A component must NEVER toggle between wrapped (div) and bare (textarea) during its lifecycle,
    // as changing the root element type unmounts the DOM node and drops focus.
 const hasWrapperRef = React.useRef(false)
 if (('error' in rawProps) || Boolean(error)) {
 hasWrapperRef.current = true
    }

 if (!hasWrapperRef.current) {
 return textareaElement
    }

 return (
      <div className={cn('w-full', containerClassName)}>
        {textareaElement}
        {error && <p className="mt-1 text-xs text-destructive font-medium">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
