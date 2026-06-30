import * as React from 'react';

import { cn } from '../../lib/utils';

/** shadcn/ui 风格多行输入框。 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn('min-h-20 w-full rounded-lg border-0 bg-muted px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring', className)}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
