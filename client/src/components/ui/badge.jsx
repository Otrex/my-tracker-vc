import { cn } from '@/lib/utils';

const variants = {
  default: 'border-transparent bg-primary/15 text-primary',
  secondary: 'border-transparent bg-secondary/15 text-secondary',
  amber: 'border-transparent bg-accent/15 text-accent',
  muted: 'border-border bg-muted text-muted-foreground',
  destructive: 'border-transparent bg-destructive/15 text-destructive'
};

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold leading-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
