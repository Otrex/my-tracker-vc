import { addDays, format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WeekSelector({ week, onPrevious, onNext }) {
  const start = parseISO(week);
  const end = addDays(start, 6);
  const label = `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;

  return (
    <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2 rounded-lg border border-border bg-card/70 p-1">
      <Button variant="ghost" size="icon" onClick={onPrevious} aria-label="Previous week">
        <ChevronLeft size={20} />
      </Button>
      <div className="text-center text-sm font-semibold text-foreground">{label}</div>
      <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next week">
        <ChevronRight size={20} />
      </Button>
    </div>
  );
}
