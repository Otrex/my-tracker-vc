import { cn } from '@/lib/utils';

const variants = {
  default: 'border-primary/25 bg-primary/10 text-primary',
  secondary: 'border-secondary/25 bg-secondary/10 text-secondary',
  amber: 'border-accent/25 bg-accent/10 text-accent',
  muted: 'border-border/80 bg-muted/55 text-muted-foreground',
  destructive: 'border-destructive/25 bg-destructive/10 text-destructive'
};

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium leading-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
