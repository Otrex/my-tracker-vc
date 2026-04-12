import React from 'react';
import { Eye, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const WORK_SECONDS = 20 * 60;
const REST_SECONDS = 20;

function formatClock(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export function EyeCareScreen() {
  const [phase, setPhase] = React.useState('work');
  const [seconds, setSeconds] = React.useState(WORK_SECONDS);
  const [running, setRunning] = React.useState(false);
  const [cycles, setCycles] = React.useState(0);

  React.useEffect(() => {
    if (!running) return undefined;

    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current > 1) return current - 1;

        if (phase === 'work') {
          setPhase('rest');
          return REST_SECONDS;
        }

        setPhase('work');
        setCycles((value) => value + 1);
        return WORK_SECONDS;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running, phase]);

  const reset = () => {
    setRunning(false);
    setPhase('work');
    setSeconds(WORK_SECONDS);
    setCycles(0);
  };

  const progress = phase === 'work'
    ? 100 - (seconds / WORK_SECONDS) * 100
    : 100 - (seconds / REST_SECONDS) * 100;

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Eye size={15} />
              20-20-20 protocol
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight lg:text-5xl">Protect your eyes while you work.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Every 20 minutes, look at something roughly 20 feet away for 20 seconds. This timer keeps the reminder separate from your routine and learning dashboards.
            </p>
            <div className="mt-5 grid grid-cols-3 border border-border bg-muted/25">
              <div className="border-r border-border p-3">
                <p className="font-mono text-[11px] uppercase text-muted-foreground">Work</p>
                <p className="text-lg font-semibold">20 min</p>
              </div>
              <div className="border-r border-border p-3">
                <p className="font-mono text-[11px] uppercase text-muted-foreground">Look away</p>
                <p className="text-lg font-semibold">20 sec</p>
              </div>
              <div className="p-3">
                <p className="font-mono text-[11px] uppercase text-muted-foreground">Cycles</p>
                <p className="text-lg font-semibold">{cycles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="border border-border bg-muted/25 p-5 text-center">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {phase === 'work' ? 'Focus block' : 'Eye break'}
              </p>
              <div className="my-8 font-mono text-7xl font-bold tracking-tight lg:text-8xl">{formatClock(seconds)}</div>
              <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                {phase === 'work'
                  ? 'Keep working. The app will switch to a 20-second eye break.'
                  : 'Look out a window or at the farthest object in the room.'}
              </p>
            </div>

            <div className="mt-4 h-2 border border-border bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button onClick={() => setRunning((value) => !value)}>
                {running ? <Pause size={17} /> : <Play size={17} />}
                {running ? 'Pause' : 'Start'}
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcw size={17} />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
