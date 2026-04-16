import React from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  outline: 'border border-border bg-background/45 text-foreground hover:bg-muted/70',
  ghost: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
};

const sizes = {
  default: 'h-11 px-4 py-2',
  sm: 'h-10 px-3',
  icon: 'h-11 w-11'
};

export const Button = React.forwardRef(function Button(
  { className, variant = 'primary', size = 'default', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
