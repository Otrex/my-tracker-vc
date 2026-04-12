import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('space-y-1.5 p-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-4 pt-0', className)} {...props} />;
}
