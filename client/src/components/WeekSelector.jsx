import { addDays, format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WeekSelector({ week, onPrevious, onNext, className }) {
  const start = parseISO(week);
  const end = addDays(start, 6);
  const label = `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;

  return (
    <div className={cn('grid h-11 min-w-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center border border-border bg-card/70', className)}>
      <Button className="h-10 w-10" variant="ghost" size="icon" onClick={onPrevious} aria-label="Previous week">
        <ChevronLeft size={20} />
      </Button>
      <div className="truncate px-2 text-center text-sm font-semibold leading-none text-foreground">{label}</div>
      <Button className="h-10 w-10" variant="ghost" size="icon" onClick={onNext} aria-label="Next week">
        <ChevronRight size={20} />
      </Button>
    </div>
  );
}
