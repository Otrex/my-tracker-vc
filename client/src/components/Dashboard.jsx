import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart3, BookOpenCheck, CheckCircle2, Droplets, GraduationCap, Timer, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useDietWeek } from '@/hooks/useDiet';
import { useLearning } from '@/hooks/useLearning';

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function MetricCard({ icon: Icon, label, value, detail, action, onClick }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted text-primary">
            <Icon size={20} />
          </div>
          {action ? <Badge variant="muted">{action}</Badge> : null}
        </div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{detail}</p>
        {onClick ? (
          <Button className="mt-4 w-full" variant="outline" onClick={onClick}>
            Open
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProgressLine({ label, value, max }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 border border-border bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Dashboard({ week, rows, isLoading }) {
  const navigate = useNavigate();
  const dietWeek = useDietWeek(week);
  const learning = useLearning();
  const daysDone = rows.filter((row) => row.completed === 'Yes').length;
  const totalActual = sum(rows, 'actual_duration');
  const totalPlanned = sum(rows, 'planned_duration');
  const totalMiles = sum(rows, 'miles_travelled');
  const totalReps = sum(rows, 'skips_reps');
  const dietDays = dietWeek.data?.days || [];
  const dietTotals = dietDays.reduce((acc, day) => {
    acc.calories += Number(day.summary?.calories || 0);
    acc.protein += Number(day.summary?.protein || 0);
    acc.water += Number(day.summary?.water_liters || 0);
    acc.loggedDays += day.entries_count ? 1 : 0;
    return acc;
  }, { calories: 0, protein: 0, water: 0, loggedDays: 0 });
  const learningPlans = learning.data || [];
  const activePlans = learningPlans.filter((plan) => plan.status !== 'Mastered').length;
  const masteredPlans = learningPlans.filter((plan) => plan.status === 'Mastered').length;
  const reviewPlans = learningPlans.filter((plan) => plan.status === 'Review').length;
  const examAverage = learningPlans.length
    ? Math.round(learningPlans.reduce((total, plan) => total + Number(plan.best_exam_score || 0), 0) / learningPlans.length)
    : 0;

  if (isLoading || dietWeek.isLoading || learning.isLoading) {
    return (
      <section className="h-full overflow-y-auto px-4 py-4 lg:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="skeleton h-28" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="skeleton h-40" />
            <div className="skeleton h-40" />
            <div className="skeleton h-40" />
            <div className="skeleton h-40" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 border border-border bg-card p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <BarChart3 size={15} />
            All feature metrics
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Your operating dashboard</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            A simple overview of tracking, fitness, diet, learning, and review items. Check-in stays first because daily tracking is the main habit.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={CheckCircle2}
            label="Check-ins"
            value={`${daysDone}/7`}
            detail="Days fully completed this week from the daily check-in flow."
            action="Tracking"
            onClick={() => navigate('/checkin')}
          />
          <MetricCard
            icon={Activity}
            label="Fitness"
            value={`${totalActual.toFixed(1)}h`}
            detail={`${totalPlanned.toFixed(1)}h planned, ${totalMiles.toFixed(1)} miles, ${Math.round(totalReps)} reps logged.`}
            action="Routine"
            onClick={() => navigate('/fitness')}
          />
          <MetricCard
            icon={Utensils}
            label="Diet"
            value={`${dietDays.length ? dietTotals.loggedDays : 0}/7`}
            detail={`${Math.round(dietTotals.calories)} calories, ${Math.round(dietTotals.protein)}g protein, ${dietTotals.water.toFixed(1)}L water this week.`}
            action="Nutrition"
            onClick={() => navigate('/diet/today')}
          />
          <MetricCard
            icon={BookOpenCheck}
            label="Learning"
            value={`${activePlans}`}
            detail={`${masteredPlans} mastered, ${reviewPlans} need review, ${examAverage}% average best exam score.`}
            action="Study"
            onClick={() => navigate('/learning/plan')}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardContent className="p-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">This week</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">Feature health</h3>
              <div className="mt-5 space-y-4">
                <ProgressLine label="Check-in completion" value={daysDone} max={7} />
                <ProgressLine label="Fitness hours" value={totalActual} max={Math.max(1, totalPlanned)} />
                <ProgressLine label="Diet logged days" value={dietTotals.loggedDays} max={7} />
                <ProgressLine label="Learning exam average" value={examAverage} max={100} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Next best actions</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">What to open now</h3>
              <div className="mt-4 grid gap-2">
                <Button className="justify-start" onClick={() => navigate('/checkin')}>
                  <Timer size={17} />
                  Do today’s check-in
                </Button>
                <Button className="justify-start" variant="outline" onClick={() => navigate('/diet/add')}>
                  <Droplets size={17} />
                  Add food or water
                </Button>
                <Button className="justify-start" variant="outline" onClick={() => navigate('/learning/exam')}>
                  <GraduationCap size={17} />
                  Take or review an exam
                </Button>
                <Button className="justify-start" variant="outline" onClick={() => navigate('/fitness')}>
                  <Activity size={17} />
                  Edit weekly fitness details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
