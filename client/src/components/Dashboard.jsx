import React from 'react';
import { motion } from 'framer-motion';
import { format, isSameWeek, parseISO } from 'date-fns';
import { Activity, CheckCircle2, Flame, Gauge, Loader2, LockKeyhole, Save, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateRoutine, useWeeks } from '@/hooks/useRoutine';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function rateColor(rate) {
  if (rate >= 80) return 'text-secondary';
  if (rate >= 50) return 'text-accent';
  return 'text-destructive';
}

function barColor(row) {
  const actual = Number(row.actual_duration || 0);
  const planned = Number(row.planned_duration || 0);
  if (actual >= planned && planned > 0) return 'bg-secondary';
  if (actual > 0 || row.completed === 'Partial') return 'bg-accent';
  return 'bg-destructive';
}

function completionStreak(rows, week) {
  if (!rows.length) return 0;

  const currentWeek = isSameWeek(parseISO(week), new Date(), { weekStartsOn: 1 });
  const todayIndex = currentWeek ? rows.findIndex((row) => row.day === format(new Date(), 'EEEE')) : rows.length - 1;
  let streak = 0;

  for (let index = Math.max(0, todayIndex); index >= 0; index -= 1) {
    if (rows[index]?.completed !== 'Yes') break;
    streak += 1;
  }

  return streak;
}

function weekChipLabel(week) {
  return format(parseISO(week), 'MMM d');
}

function DashboardRow({ row, week, updateToken }) {
  const [draft, setDraft] = React.useState(row);
  const [customPlan, setCustomPlan] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const updateRoutine = useUpdateRoutine();
  const { toast } = useToast();

  React.useEffect(() => {
    setDraft(row);
  }, [row]);

  const setCompleted = (completed) => {
    setDraft((current) => ({
      ...current,
      completed,
      actual_duration: completed === 'Yes' ? current.planned_duration : completed === 'No' ? 0 : current.actual_duration
    }));
  };

  const save = async () => {
    if (!updateToken) {
      toast('Enter the back-office update token first', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateRoutine.mutateAsync({
        id: draft.id,
        week,
        updateToken,
        data: {
          completed: draft.completed,
          actual_duration: Number(draft.actual_duration || 0),
          miles_travelled: Number(draft.miles_travelled || 0),
          skips_reps: Number(draft.skips_reps || 0),
          workout_notes: draft.workout_notes || '',
          notes: draft.notes || '',
          planned_activity: draft.planned_activity,
          planned_duration: Number(draft.planned_duration || 0)
        }
      });
      toast(`${draft.day} updated`);
    } catch (error) {
      toast(error.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statusButton = (status) => (
    <button
      key={status}
      type="button"
      onClick={() => setCompleted(status)}
      className={cn(
        'min-h-9 rounded-lg border px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition active:scale-[0.98]',
        draft.completed === status
          ? status === 'Yes'
            ? 'border-secondary bg-secondary text-secondary-foreground'
            : status === 'Partial'
              ? 'border-accent bg-accent text-accent-foreground'
              : 'border-destructive bg-destructive text-destructive-foreground'
          : 'border-border bg-muted/40 text-muted-foreground'
      )}
    >
      {status}
    </button>
  );

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="hidden grid-cols-[120px_190px_92px_92px_92px_1fr_80px] items-start gap-3 p-3 lg:grid">
        <div>
          <p className="font-semibold">{draft.day}</p>
          <Badge className="mt-2" variant={draft.completed === 'Yes' ? 'secondary' : draft.completed === 'Partial' ? 'amber' : 'destructive'}>{draft.completed}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-1">{['Yes', 'Partial', 'No'].map(statusButton)}</div>
        <Input
          type="number"
          min="0"
          step="0.25"
          value={draft.actual_duration}
          onChange={(event) => setDraft((current) => ({ ...current, actual_duration: event.target.value }))}
        />
        <Input
          type="number"
          min="0"
          step="0.1"
          value={draft.miles_travelled || 0}
          onChange={(event) => setDraft((current) => ({ ...current, miles_travelled: event.target.value }))}
        />
        <Input
          type="number"
          min="0"
          step="1"
          value={draft.skips_reps || 0}
          onChange={(event) => setDraft((current) => ({ ...current, skips_reps: event.target.value }))}
        />
        <div className="space-y-2">
        <Input
          type="number"
          min="0"
          step="0.25"
          disabled={!customPlan}
          value={draft.planned_duration}
          onChange={(event) => setDraft((current) => ({ ...current, planned_duration: event.target.value }))}
        />
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-muted/35 px-3 text-xs font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={customPlan}
              onChange={(event) => setCustomPlan(event.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Unlock plan
          </label>
          {customPlan ? (
            <Input
              value={draft.planned_activity}
              onChange={(event) => setDraft((current) => ({ ...current, planned_activity: event.target.value }))}
            />
          ) : (
            <p className="truncate text-sm font-medium">{draft.planned_activity}</p>
          )}
          <Textarea
            rows={2}
            value={draft.workout_notes || ''}
            onChange={(event) => setDraft((current) => ({ ...current, workout_notes: event.target.value }))}
            placeholder="Workout details"
          />
          <Textarea
            rows={2}
            value={draft.notes || ''}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="General notes"
          />
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
          Save
        </Button>
      </div>

      <div className="space-y-3 p-3 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{draft.day}</p>
            <p className="text-sm text-muted-foreground">{draft.planned_activity}</p>
          </div>
          <Badge variant={draft.completed === 'Yes' ? 'secondary' : draft.completed === 'Partial' ? 'amber' : 'destructive'}>{draft.completed}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-1">{['Yes', 'Partial', 'No'].map(statusButton)}</div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Actual</span>
            <Input type="number" min="0" step="0.25" value={draft.actual_duration} onChange={(event) => setDraft((current) => ({ ...current, actual_duration: event.target.value }))} />
          </label>
          <label>
            <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Planned</span>
            <Input type="number" min="0" step="0.25" disabled={!customPlan} value={draft.planned_duration} onChange={(event) => setDraft((current) => ({ ...current, planned_duration: event.target.value }))} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Miles</span>
            <Input type="number" min="0" step="0.1" value={draft.miles_travelled || 0} onChange={(event) => setDraft((current) => ({ ...current, miles_travelled: event.target.value }))} />
          </label>
          <label>
            <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Skips / reps</span>
            <Input type="number" min="0" step="1" value={draft.skips_reps || 0} onChange={(event) => setDraft((current) => ({ ...current, skips_reps: event.target.value }))} />
          </label>
        </div>
        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-muted/35 px-3 text-sm font-semibold">
          <input type="checkbox" checked={customPlan} onChange={(event) => setCustomPlan(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Unlock planned activity
        </label>
        {customPlan ? (
          <Input value={draft.planned_activity} onChange={(event) => setDraft((current) => ({ ...current, planned_activity: event.target.value }))} />
        ) : null}
        <Input value={draft.workout_notes || ''} onChange={(event) => setDraft((current) => ({ ...current, workout_notes: event.target.value }))} placeholder="Workout details" />
        <Textarea rows={2} value={draft.notes || ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="General notes" />
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
          Save {draft.day}
        </Button>
      </div>
    </div>
  );
}

export function Dashboard({ week, rows, isLoading, onWeekSelect }) {
  const weeks = useWeeks();
  const [selectedBar, setSelectedBar] = React.useState(null);
  const [updateToken, setUpdateToken] = React.useState(() => localStorage.getItem('updateToken') || '');
  const totalPlanned = sum(rows, 'planned_duration');
  const totalActual = sum(rows, 'actual_duration');
  const totalMiles = sum(rows, 'miles_travelled');
  const totalReps = sum(rows, 'skips_reps');
  const daysDone = rows.filter((row) => row.completed === 'Yes').length;
  const completionRate = rows.length ? Math.round((daysDone / rows.length) * 100) : 0;
  const onTrack = rows.filter((row) => Number(row.actual_duration || 0) >= Number(row.planned_duration || 0) && Number(row.planned_duration || 0) > 0).length;
  const maxHours = Math.max(3, ...rows.map((row) => Math.max(Number(row.planned_duration || 0), Number(row.actual_duration || 0))));
  const streak = completionStreak(rows, week);

  const kpis = [
    { label: 'Days Done', value: `${daysDone} / 7`, icon: CheckCircle2, color: 'text-secondary' },
    { label: 'Hours Logged', value: `${totalActual.toFixed(2)} / ${totalPlanned.toFixed(2)}`, icon: Timer, color: 'text-primary' },
    { label: 'Completion', value: `${completionRate}%`, icon: Gauge, color: rateColor(completionRate) },
    { label: 'Streak', value: `${streak} day${streak === 1 ? '' : 's'}`, icon: Flame, color: 'text-accent' },
    { label: 'Miles', value: totalMiles.toFixed(1), icon: Gauge, color: 'text-primary' },
    { label: 'Skips/Reps', value: `${Math.round(totalReps)}`, icon: CheckCircle2, color: 'text-secondary' }
  ];

  React.useEffect(() => {
    if (updateToken) {
      localStorage.setItem('updateToken', updateToken);
    } else {
      localStorage.removeItem('updateToken');
    }
  }, [updateToken]);

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-4">
        <div className="skeleton h-12 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-32 rounded-lg" />
          <div className="skeleton h-32 rounded-lg" />
          <div className="skeleton h-32 rounded-lg" />
          <div className="skeleton h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 border border-border bg-card p-4">
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Activity size={15} />
          Operating snapshot
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Routine performance</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Overview of adherence, movement output, and direct edits for the selected week. Week navigation and export live in the main header.
        </p>
      </div>

      <Card className="mb-5 border-primary/20">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-primary">
              <LockKeyhole size={16} />
              Dashboard update token
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use the fixed back-office token to update any day or customize the fixed plan.
            </p>
          </div>
          <Input
            type="password"
            value={updateToken}
            onChange={(event) => setUpdateToken(event.target.value)}
            placeholder="Enter update token"
          />
        </CardContent>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
        {kpis.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="min-h-32">
                <CardContent className="p-4">
                  <div className={cn('mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-muted', item.color)}>
                    <Icon size={21} />
                  </div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                  <p className={cn('mt-1 text-2xl font-bold', item.color)}>{item.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Weekly Bars</p>
              <h3 className="text-2xl font-semibold tracking-tight">Actual vs planned</h3>
            </div>
            <Badge variant={onTrack >= 5 ? 'secondary' : onTrack >= 3 ? 'amber' : 'destructive'}>{onTrack} on track</Badge>
          </div>

          <div className="flex h-52 items-end justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
            {rows.map((row, index) => {
              const plannedHeight = Math.max(8, (Number(row.planned_duration || 0) / maxHours) * 100);
              const actualHeight = Math.min(100, Math.max(4, (Number(row.actual_duration || 0) / maxHours) * 100));
              const active = selectedBar?.id === row.id;

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedBar(active ? null : row)}
                  className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-lg transition active:scale-95"
                >
                  {active ? (
                    <div className="absolute -top-2 z-10 w-32 rounded-lg border border-border bg-card p-2 text-left text-[11px]">
                      <p className="font-bold text-foreground">{row.day}</p>
                      <p className="text-muted-foreground">{Number(row.actual_duration || 0).toFixed(2)} of {Number(row.planned_duration || 0).toFixed(2)} hrs</p>
                    </div>
                  ) : null}
                  <div className="relative flex h-36 w-full max-w-8 items-end justify-center rounded-lg bg-white/10">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${plannedHeight}%` }}
                      transition={{ delay: index * 0.06, duration: 0.45 }}
                      className="absolute bottom-0 w-full rounded-lg bg-white/[0.18]"
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${actualHeight}%` }}
                      transition={{ delay: 0.12 + index * 0.06, duration: 0.5 }}
                      className={cn('absolute bottom-0 w-full rounded-lg', barColor(row))}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">{row.day.slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Direct Updates</p>
            <h3 className="text-2xl font-semibold tracking-tight">Weekly editor</h3>
          </div>
          <div className="hidden grid-cols-[120px_190px_92px_92px_92px_1fr_80px] gap-3 border-b border-border bg-muted/25 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
            <span>Day</span>
            <span>Status</span>
            <span>Actual</span>
            <span>Miles</span>
            <span>Reps</span>
            <span>Plan, activity, notes</span>
            <span>Action</span>
          </div>
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <DashboardRow key={row.id} row={row} week={week} updateToken={updateToken} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-2">
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Week History</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {(weeks.data || [week]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onWeekSelect(item)}
              className={cn(
                'min-h-11 shrink-0 rounded-lg border px-4 text-sm font-bold transition active:scale-95',
                item === week ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'
              )}
            >
              {weekChipLabel(item)}
            </button>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}
