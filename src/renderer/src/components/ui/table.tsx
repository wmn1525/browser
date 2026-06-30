import * as React from 'react';

import { cn } from '../../lib/utils';

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>): JSX.Element {
  return <table className={cn('w-full border-collapse text-left text-sm', className)} {...props} />;
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return (
    <th
      className={cn('whitespace-nowrap bg-muted px-4 py-3 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={cn('border-b px-4 py-3 align-middle', className)} {...props} />;
}
