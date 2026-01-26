import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout
          'flex h-9 w-full rounded-md',
          // Border and background
          'border border-input bg-transparent',
          // Padding
          'px-3 py-1',
          // Typography
          'text-base shadow-sm',
          // Responsive typography
          'md:text-sm',
          // Transitions
          'transition-colors',
          // File input styling
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          // Placeholder
          'placeholder:text-muted-foreground',
          // Focus states
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          // Disabled states
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
