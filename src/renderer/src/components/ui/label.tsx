import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

import { cn } from '../../lib/utils';

/** shadcn/ui 风格表单标签。 */
export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root className={cn('text-xs font-medium text-muted-foreground', className)} ref={ref} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;
