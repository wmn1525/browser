import * as React from 'react';

import { cn } from '../../lib/utils';

/** shadcn/ui 风格输入框。 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        'flex h-9 w-full rounded-lg border-0 bg-muted px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = 'Input';
