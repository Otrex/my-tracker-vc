import React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-20 w-full resize-none rounded-lg border border-border bg-muted/60 px-3 py-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25',
        className
      )}
      {...props}
    />
  );
});
