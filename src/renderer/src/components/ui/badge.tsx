import * as React from 'react';

import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  readonly tone?: 'default' | 'muted' | 'primary';
}

/** 表格中的小标签。 */
export function Badge({ className, tone = 'default', ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium',
        tone === 'default' && 'border text-muted-foreground',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'primary' && 'bg-blue-50 text-primary',
        className
      )}
      {...props}
    />
  );
}
