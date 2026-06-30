import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from './button';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

/** 弹窗主体，使用 Radix Dialog 负责可访问性和焦点管理。 */
export function DialogContent({
  className,
  children
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/25" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-5 shadow-2xl',
          className
        )}
      >
        {children}
        <DialogPrimitive.Close asChild>
          <Button className="absolute right-4 top-4" size="icon" type="button" variant="ghost">
            <X className="size-4" />
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;
