import React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25',
        className
      )}
      {...props}
    />
  );
});
