import React from 'react';
import { motion } from 'framer-motion';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, LockKeyhole, MinusCircle, Save, Timer, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateRoutine } from '@/hooks/useRoutine';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const options = [
  { value: 'Yes', label: 'Done', icon: CheckCircle2, color: 'secondary' },
  { value: 'Partial', label: 'A little', icon: MinusCircle, color: 'accent' },
  { value: 'No', label: 'Skipped', icon: XCircle, color: 'destructive' }
];

function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="skeleton h-16 rounded-lg" />
      <div className="skeleton h-[420px] rounded-lg" />
    </div>
  );
}

function sliderColor(row) {
  const actual = Number(row.actual_duration || 0);
  const planned = Number(row.planned_duration || 0);
  if (actual >= planned && planned > 0) return '#2eb87a';
  if (actual > 0 || row.completed === 'Partial') return '#ffcc1a';
  return '#f04040';
}

function workoutFieldsFor(activity = '') {
  const lower = activity.toLowerCase();
  const fields = [];

  if (lower.includes('walking') || lower.includes('cycling') || lower.includes('jogging')) {
    fields.push({ key: 'miles_travelled', label: 'Miles travelled', step: '0.1' });
  }

  if (lower.includes('skipping') || lower.includes('stretching')) {
    fields.push({ key: 'skips_reps', label: lower.includes('stretching') ? 'Stretch reps / sets' : 'Skips / reps', step: '1' });
  }

  if (!fields.length) {
    fields.push({ key: 'skips_reps', label: 'Reps / sets', step: '1' });
  }

  return fields;
}

export function CheckInScreen({ selectedDate, week, rows, isLoading, onShiftDate, onOpenDashboard }) {
  const updateRoutine = useUpdateRoutine();
  const { toast } = useToast();
  const [draft, setDraft] = React.useState(null);
  const [customDuration, setCustomDuration] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const date = parseISO(selectedDate);
  const isToday = isSameDay(date, new Date());
  const dayName = format(date, 'EEEE');
  const row = rows.find((item) => item.day === dayName);

  React.useEffect(() => {
    if (row) {
      setDraft(row);
      setCustomDuration(Number(row.actual_duration || 0) !== Number(row.planned_duration || 0) && Number(row.actual_duration || 0) > 0);
    }
  }, [row]);

  if (isLoading || !draft) {
    return <Skeleton />;
  }

  const readOnly = !isToday;
  const color = sliderColor(draft);
  const workoutFields = workoutFieldsFor(draft.planned_activity);

  const patchDraft = (patch) => {
    if (readOnly) return;
    setDraft((current) => ({ ...current, ...patch }));
  };

  const chooseStatus = (completed) => {
    if (readOnly) return;

    if (completed === 'Yes' && !customDuration) {
      patchDraft({ completed, actual_duration: Number(draft.planned_duration || 0) });
      return;
    }

    if (completed === 'No') {
      patchDraft({ completed, actual_duration: 0 });
      return;
    }

    patchDraft({ completed });
    setCustomDuration(true);
  };

  const save = async () => {
    if (readOnly) {
      toast('Shifted days are view-only here', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateRoutine.mutateAsync({
        id: draft.id,
        week,
        data: {
          completed: draft.completed,
          actual_duration: Number(draft.actual_duration || 0),
          miles_travelled: Number(draft.miles_travelled || 0),
          skips_reps: Number(draft.skips_reps || 0),
          workout_notes: draft.workout_notes || '',
          notes: draft.notes || ''
        }
      });
      toast('Check-in saved');
    } catch (error) {
      toast(error.message || 'Could not save check-in', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-5 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card/70 p-5"
        >
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Daily check-in</p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground lg:text-6xl">How did your morning go?</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Keep this one screen light. Today can be updated here; past and future days are view-only until you use the dashboard token.
          </p>
          <Button variant="outline" className="mt-5 w-full lg:w-auto" onClick={onOpenDashboard}>
            Open dashboard
          </Button>
        </motion.aside>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className={cn('overflow-hidden', isToday ? 'border-primary/50' : 'border-border')}>
            <CardContent className="p-0">
              <div className="border-b border-border p-4 sm:p-5">
                <div className="mb-4 grid grid-cols-[44px_1fr_44px] items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => onShiftDate(-1)} aria-label="Previous day">
                    <ChevronLeft size={19} />
                  </Button>
                  <div className="text-center">
                    <p className="flex items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <CalendarDays size={14} />
                      {format(date, 'MMMM d, yyyy')}
                    </p>
                    <h3 className="text-3xl font-semibold leading-tight tracking-tight">{dayName}</h3>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => onShiftDate(1)} aria-label="Next day">
                    <ChevronRight size={19} />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{draft.planned_activity}</Badge>
                  <Badge variant="muted">
                    <Timer size={13} />
                    {Number(draft.planned_duration || 0).toFixed(2)} hrs fixed plan
                  </Badge>
                  {readOnly ? (
                    <Badge variant="destructive">
                      <LockKeyhole size={13} />
                      View only
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Ready for today</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-6 p-4 sm:p-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-muted-foreground">Check-in status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {options.map((option) => {
                      const Icon = option.icon;
                      const active = draft.completed === option.value;
                      const activeClass = option.color === 'secondary'
                        ? 'border-secondary bg-secondary text-secondary-foreground'
                        : option.color === 'accent'
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-destructive bg-destructive text-destructive-foreground';

                      return (
                        <motion.button
                          key={option.value}
                          type="button"
                          disabled={readOnly}
                          whileTap={readOnly ? undefined : { scale: 0.94 }}
                          onClick={() => chooseStatus(option.value)}
                          className={cn(
                            'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border text-sm font-semibold transition disabled:opacity-60',
                            active ? activeClass : 'border-border bg-muted/55 text-muted-foreground'
                          )}
                        >
                          <Icon size={22} />
                          {option.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/35 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Duration</p>
                      <p className="text-xs text-muted-foreground">Plan is fixed unless you add your own actual time.</p>
                    </div>
                    <Badge style={{ color }} className="border-current bg-transparent">
                      {Number(draft.actual_duration || 0).toFixed(2)} hrs
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant={!customDuration ? 'primary' : 'outline'}
                      disabled={readOnly}
                      onClick={() => {
                        setCustomDuration(false);
                        patchDraft({ actual_duration: Number(draft.planned_duration || 0) });
                      }}
                    >
                      Use fixed plan
                    </Button>
                    <Button variant={customDuration ? 'primary' : 'outline'} disabled={readOnly} onClick={() => setCustomDuration(true)}>
                      Add my own
                    </Button>
                  </div>

                  {customDuration ? (
                    <div className="mt-4 space-y-3">
                      <Slider
                        value={Number(draft.actual_duration || 0)}
                        min={0}
                        max={3}
                        step={0.25}
                        color={color}
                        disabled={readOnly}
                        onChange={(value) => patchDraft({ actual_duration: value })}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        disabled={readOnly}
                        value={draft.actual_duration}
                        onChange={(event) => patchDraft({ actual_duration: event.target.value })}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-border bg-muted/35 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold">Workout details</p>
                    <p className="text-xs text-muted-foreground">Use the fields that fit the activity. Miles for walking/cycling/jogging, reps for skipping or strength work.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {workoutFields.map((field) => (
                    <label key={field.key}>
                      <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{field.label}</span>
                      <Input
                        type="number"
                        min="0"
                        step={field.step}
                        disabled={readOnly}
                        value={draft[field.key] || 0}
                        onChange={(event) => patchDraft({ [field.key]: event.target.value })}
                      />
                    </label>
                    ))}
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Workout note</span>
                    <Input
                      disabled={readOnly}
                      value={draft.workout_notes || ''}
                      onChange={(event) => patchDraft({ workout_notes: event.target.value })}
                      placeholder="Route, set type, pace, intensity..."
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-muted-foreground">A quick note</span>
                  <Textarea
                    disabled={readOnly}
                    value={draft.notes || ''}
                    onChange={(event) => patchDraft({ notes: event.target.value })}
                    placeholder={readOnly ? 'View-only outside today.' : 'What helped, what got in the way?'}
                  />
                </label>

                {readOnly ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
                    This day is locked on the check-in screen. Open the dashboard and enter the back-office update token to edit it.
                  </div>
                ) : (
                  <Button className="w-full" onClick={save} disabled={saving}>
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save today'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
