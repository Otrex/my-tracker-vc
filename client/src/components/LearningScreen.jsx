import React from 'react';
import { format } from 'date-fns';
import { BarChart3, BookOpenCheck, GraduationCap, Plus, Save, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useAddLearningSession,
  useCreateLearningSubject,
  useLearning,
  useLearningSettings,
  useSubmitLearningExam,
  useUpdateLearningSettings
} from '@/hooks/useLearning';
import { useToast } from '@/components/ui/toast';

const subjectDefaults = {
  title: '',
  learning_plan: '',
  total_duration: 10,
  duration_per_day: '',
  goal_questions: ''
};

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd');
}

function SubjectCard({ subject, defaultDuration }) {
  const [session, setSession] = React.useState({
    session_date: todayIso(),
    planned_duration: subject.duration_per_day || defaultDuration,
    actual_duration: subject.duration_per_day || defaultDuration,
    completed: true,
    notes: ''
  });
  const [answers, setAnswers] = React.useState((subject.goal_questions || []).map(() => ''));
  const addSession = useAddLearningSession();
  const submitExam = useSubmitLearningExam();
  const { toast } = useToast();
  const progress = Number(subject.progress?.actual_duration || 0);
  const target = Number(subject.total_duration || 0);
  const pct = target ? Math.min(100, Math.round((progress / target) * 100)) : 0;

  const logSession = async () => {
    try {
      await addSession.mutateAsync({ subjectId: subject.id, data: session });
      toast('Learning session logged');
    } catch (error) {
      toast(error.message || 'Could not log session', 'error');
    }
  };

  const grade = async () => {
    try {
      const result = await submitExam.mutateAsync({ subjectId: subject.id, data: { answers } });
      toast(`Exam graded: ${Math.round(result.score)}%`);
    } catch (error) {
      toast(error.message || 'Could not grade exam', 'error');
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{subject.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{subject.learning_plan || 'No plan details yet.'}</p>
          </div>
          <Badge variant={pct >= 100 ? 'secondary' : pct >= 50 ? 'amber' : 'muted'}>{pct}%</Badge>
        </div>

        <div className="h-2 border border-border bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid grid-cols-3 border border-border bg-muted/25">
          <div className="border-r border-border p-3"><p className="font-mono text-[11px] uppercase text-muted-foreground">Logged</p><p className="text-lg font-semibold">{progress.toFixed(1)}h</p></div>
          <div className="border-r border-border p-3"><p className="font-mono text-[11px] uppercase text-muted-foreground">Target</p><p className="text-lg font-semibold">{target.toFixed(1)}h</p></div>
          <div className="p-3"><p className="font-mono text-[11px] uppercase text-muted-foreground">Best exam</p><p className="text-lg font-semibold">{Math.round(subject.best_exam_score || 0)}%</p></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="border border-border bg-muted/20 p-3">
            <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Session log</p>
            <div className="grid gap-2">
              <Input type="date" value={session.session_date} onChange={(event) => setSession((current) => ({ ...current, session_date: event.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="0" step="0.25" value={session.planned_duration} onChange={(event) => setSession((current) => ({ ...current, planned_duration: event.target.value }))} placeholder="Planned h" />
                <Input type="number" min="0" step="0.25" value={session.actual_duration} onChange={(event) => setSession((current) => ({ ...current, actual_duration: event.target.value }))} placeholder="Actual h" />
              </div>
              <Input value={session.notes} onChange={(event) => setSession((current) => ({ ...current, notes: event.target.value }))} placeholder="Session notes" />
              <Button onClick={logSession}><Save size={16} /> Log session</Button>
            </div>
          </div>

          <div className="border border-border bg-muted/20 p-3">
            <p className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><GraduationCap size={15} /> Exam readiness</p>
            {subject.goal_questions?.length ? (
              <div className="space-y-3">
                {subject.goal_questions.map((question, index) => (
                  <label key={question} className="block">
                    <span className="mb-1 block text-sm text-muted-foreground">{index + 1}. {question}</span>
                    <Textarea value={answers[index] || ''} onChange={(event) => setAnswers((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Answer from memory" />
                  </label>
                ))}
                <Button variant="outline" onClick={grade}>Grade exam</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Add goal questions to enable exam mode.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LearningScreen() {
  const learning = useLearning();
  const settings = useLearningSettings();
  const createSubject = useCreateLearningSubject();
  const updateSettings = useUpdateLearningSettings();
  const { toast } = useToast();
  const [subject, setSubject] = React.useState(subjectDefaults);
  const [admin, setAdmin] = React.useState({ token: '', default_duration: 1 });
  const defaultDuration = Number(settings.data?.default_duration || 1);
  const subjects = learning.data || [];
  const totalTarget = subjects.reduce((sum, item) => sum + Number(item.total_duration || 0), 0);
  const totalLogged = subjects.reduce((sum, item) => sum + Number(item.progress?.actual_duration || 0), 0);
  const averageExam = subjects.length
    ? Math.round(subjects.reduce((sum, item) => sum + Number(item.best_exam_score || 0), 0) / subjects.length)
    : 0;

  React.useEffect(() => {
    setAdmin((current) => ({ ...current, default_duration: defaultDuration }));
  }, [defaultDuration]);

  const create = async () => {
    try {
      await createSubject.mutateAsync(subject);
      setSubject(subjectDefaults);
      toast('Subject created');
    } catch (error) {
      toast(error.message || 'Could not create subject', 'error');
    }
  };

  const saveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        updateToken: admin.token,
        data: { default_duration: Number(admin.default_duration || 1) }
      });
      toast('Learning default updated');
    } catch (error) {
      toast(error.message || 'Could not update learning default', 'error');
    }
  };

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><BookOpenCheck size={15} /> Learning management</p>
            <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Curriculum workspace</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Plan subjects, set learning goals, log study time, and verify readiness with goal-question exams.</p>
          </div>
          <Badge variant="muted">Default {defaultDuration}h/day</Badge>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card><CardContent className="p-4"><p className="font-mono text-[11px] uppercase text-muted-foreground">Subjects</p><p className="mt-1 text-2xl font-semibold">{subjects.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="font-mono text-[11px] uppercase text-muted-foreground">Logged</p><p className="mt-1 text-2xl font-semibold">{totalLogged.toFixed(1)}h</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="font-mono text-[11px] uppercase text-muted-foreground">Target</p><p className="mt-1 text-2xl font-semibold">{totalTarget.toFixed(1)}h</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="flex items-center gap-2 font-mono text-[11px] uppercase text-muted-foreground"><BarChart3 size={14} /> Exam avg</p><p className="mt-1 text-2xl font-semibold">{averageExam}%</p></CardContent></Card>
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="text-xl font-semibold tracking-tight">Curriculum builder</h3>
              <Input value={subject.title} onChange={(event) => setSubject((current) => ({ ...current, title: event.target.value }))} placeholder="Subject / curriculum" />
              <Textarea value={subject.learning_plan} onChange={(event) => setSubject((current) => ({ ...current, learning_plan: event.target.value }))} placeholder="Learning plan" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input type="number" min="0" step="0.5" value={subject.total_duration} onChange={(event) => setSubject((current) => ({ ...current, total_duration: event.target.value }))} placeholder="Total hours" />
                <Input type="number" min="0" step="0.25" value={subject.duration_per_day} onChange={(event) => setSubject((current) => ({ ...current, duration_per_day: event.target.value }))} placeholder={`Daily hours (default ${defaultDuration})`} />
              </div>
              <Textarea value={subject.goal_questions} onChange={(event) => setSubject((current) => ({ ...current, goal_questions: event.target.value }))} placeholder="Goal/end questions, one per line" />
              <Button onClick={create}><Plus size={17} /> Create subject</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Settings2 size={18} /> Admin default</h3>
              <p className="text-sm leading-6 text-muted-foreground">Default daily learning duration is used unless a subject overrides it.</p>
              <Input type="number" min="0" step="0.25" value={admin.default_duration} onChange={(event) => setAdmin((current) => ({ ...current, default_duration: event.target.value }))} />
              <Input type="password" value={admin.token} onChange={(event) => setAdmin((current) => ({ ...current, token: event.target.value }))} placeholder="Back-office token" />
              <Button variant="outline" onClick={saveSettings}>Save default</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {learning.isLoading ? (
            <div className="skeleton h-40 rounded-lg" />
          ) : learning.data?.length ? (
            learning.data.map((item) => <SubjectCard key={item.id} subject={item} defaultDuration={defaultDuration} />)
          ) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No learning subjects yet.</CardContent></Card>
          )}
        </div>
      </div>
    </section>
  );
}
