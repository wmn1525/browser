import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as React from 'react';

import { cn } from '../../lib/utils';

/** shadcn/ui 风格分隔线。 */
export const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <SeparatorPrimitive.Root
    className={cn(orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', 'bg-border', className)}
    orientation={orientation}
    ref={ref}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;
