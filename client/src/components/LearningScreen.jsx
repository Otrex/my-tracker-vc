import React from 'react';
import { format } from 'date-fns';
import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  ListChecks,
  Plus,
  Save,
  Settings2,
  Target,
  XCircle
} from 'lucide-react';
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
  useUpdateLearningSettings,
  useUpdateLearningSubject
} from '@/hooks/useLearning';
import { useToast } from '@/components/ui/toast';

const emptyQuestion = {
  type: 'written',
  prompt: '',
  options: '',
  correct_answer: '',
  model_answer: '',
  rubric_keywords: '',
  points: 1
};

const subjectDefaults = {
  course: 'General',
  title: '',
  end_goal: '',
  success_metrics: '',
  learning_plan: '',
  resources: '',
  milestones: '',
  total_duration: 10,
  duration_per_day: '',
  exam_duration_minutes: 30,
  pass_score: 70,
  difficulty: 'Intermediate',
  exam_questions: [{ ...emptyQuestion }]
};

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd');
}

function lines(value) {
  if (Array.isArray(value)) return value.join('\n');
  return value || '';
}

function listFromText(value) {
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function normalizeQuestion(question) {
  return {
    ...question,
    options: String(question.options || '').split('\n').map((item) => item.trim()).filter(Boolean),
    rubric_keywords: String(question.rubric_keywords || '').split(',').map((item) => item.trim()).filter(Boolean),
    points: Number(question.points || 1)
  };
}

function ProgressBar({ value, tone = 'bg-primary' }) {
  return (
    <div className="h-2 border border-border bg-muted">
      <div className={`h-full ${tone} transition-all`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function QuestionBuilder({ questions, setQuestions }) {
  const update = (index, field, value) => {
    setQuestions((current) => current.map((question, questionIndex) => (
      questionIndex === index ? { ...question, [field]: value } : question
    )));
  };

  const addQuestion = () => setQuestions((current) => [...current, { ...emptyQuestion, id: `q-${Date.now()}` }]);
  const removeQuestion = (index) => setQuestions((current) => current.filter((_question, questionIndex) => questionIndex !== index));

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <div key={question.id || index} className="border border-border bg-muted/20 p-3">
          <div className="mb-3 grid gap-2 sm:grid-cols-[150px_1fr_90px]">
            <select className="h-11 border border-input bg-background px-3 text-sm" value={question.type} onChange={(event) => update(index, 'type', event.target.value)}>
              <option value="written">Describe</option>
              <option value="mcq">Pick option</option>
              <option value="drawing">Draw + label</option>
            </select>
            <Input value={question.prompt} onChange={(event) => update(index, 'prompt', event.target.value)} placeholder="Question prompt" />
            <Input type="number" min="1" value={question.points} onChange={(event) => update(index, 'points', event.target.value)} placeholder="Pts" />
          </div>

          {question.type === 'mcq' ? (
            <div className="grid gap-2 lg:grid-cols-2">
              <Textarea rows={3} value={question.options} onChange={(event) => update(index, 'options', event.target.value)} placeholder="Options, one per line" />
              <Input value={question.correct_answer} onChange={(event) => update(index, 'correct_answer', event.target.value)} placeholder="Correct option exactly as written" />
            </div>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              <Textarea rows={3} value={question.model_answer} onChange={(event) => update(index, 'model_answer', event.target.value)} placeholder={question.type === 'drawing' ? 'Expected drawing labels / explanation' : 'Model answer'} />
              <Textarea rows={3} value={question.rubric_keywords} onChange={(event) => update(index, 'rubric_keywords', event.target.value)} placeholder="Required keywords / labels, comma separated" />
            </div>
          )}

          <Button className="mt-3" size="sm" variant="outline" onClick={() => removeQuestion(index)} disabled={questions.length === 1}>
            Remove question
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addQuestion}>
        <Plus size={16} />
        Add exam question
      </Button>
    </div>
  );
}

function DrawingAnswer({ value, onChange }) {
  const canvasRef = React.useRef(null);
  const drawingRef = React.useRef(false);

  const saveSketch = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange({ ...value, sketch_data: canvas.toDataURL('image/png') });
  }, [onChange, value]);

  const point = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const start = (event) => {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const p = point(event);
    context.beginPath();
    context.moveTo(p.x, p.y);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const p = point(event);
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.strokeStyle = '#ff8c2a';
    context.lineTo(p.x, p.y);
    context.stroke();
  };

  const stop = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    saveSketch();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    onChange({ ...value, sketch_data: '' });
  };

  return (
    <div className="space-y-2">
      <div className="border border-border bg-background p-2">
        <canvas
          ref={canvasRef}
          width="900"
          height="320"
          className="h-44 w-full touch-none bg-card"
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input value={value.labels || ''} onChange={(event) => onChange({ ...value, labels: event.target.value })} placeholder="Labels used in your drawing" />
        <Button variant="outline" onClick={clear}>Clear sketch</Button>
      </div>
      <Textarea rows={2} value={value.explanation || ''} onChange={(event) => onChange({ ...value, explanation: event.target.value })} placeholder="Briefly explain the drawing" />
    </div>
  );
}

function ExamPanel({ subject }) {
  const submitExam = useSubmitLearningExam();
  const { toast } = useToast();
  const durationSeconds = Number(subject.exam_duration_minutes || 30) * 60;
  const [started, setStarted] = React.useState(false);
  const [remaining, setRemaining] = React.useState(durationSeconds);
  const [answers, setAnswers] = React.useState([]);

  React.useEffect(() => {
    setRemaining(durationSeconds);
    setAnswers((subject.exam_questions || []).map((question) => question.type === 'drawing' ? { labels: '', explanation: '', sketch_data: '' } : ''));
  }, [durationSeconds, subject.exam_questions]);

  React.useEffect(() => {
    if (!started || remaining <= 0) return undefined;
    const id = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(id);
  }, [remaining, started]);

  const setAnswer = (index, value) => {
    setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? value : answer));
  };

  const submit = async () => {
    try {
      const result = await submitExam.mutateAsync({
        subjectId: subject.id,
        data: {
          answers,
          time_taken_seconds: durationSeconds - remaining,
          timed_out: remaining <= 0
        }
      });
      toast(`Exam graded: ${Math.round(result.score)}%`);
      setStarted(false);
    } catch (error) {
      toast(error.message || 'Could not grade exam', 'error');
    }
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');

  if (!subject.exam_questions?.length) {
    return <p className="text-sm text-muted-foreground">Add exam questions to enable timed test mode.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-muted/25 p-3">
        <div>
          <p className="font-mono text-[11px] uppercase text-muted-foreground">Timed exam</p>
          <p className="text-lg font-semibold">{started ? `${minutes}:${seconds}` : `${subject.exam_duration_minutes || 30} min`} · Pass {subject.pass_score || 70}%</p>
        </div>
        {!started ? (
          <Button onClick={() => setStarted(true)}>
            <Clock size={16} />
            Start exam
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitExam.isPending}>
            <GraduationCap size={16} />
            Submit exam
          </Button>
        )}
      </div>

      {started && (
        <div className="space-y-4">
          {subject.exam_questions.map((question, index) => (
            <div key={question.id || index} className="border border-border bg-muted/20 p-3">
              <p className="mb-2 text-sm font-semibold">{index + 1}. {question.prompt}</p>
              {question.type === 'mcq' ? (
                <div className="grid gap-2">
                  {(question.options || []).map((option) => (
                    <label key={option} className="flex min-h-11 items-center gap-2 border border-border bg-card px-3 text-sm">
                      <input type="radio" name={`${subject.id}-${index}`} checked={answers[index] === option} onChange={() => setAnswer(index, option)} />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : question.type === 'drawing' ? (
                <DrawingAnswer value={answers[index] || {}} onChange={(value) => setAnswer(index, value)} />
              ) : (
                <Textarea rows={4} value={answers[index] || ''} onChange={(event) => setAnswer(index, event.target.value)} placeholder="Answer from memory" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectCard({ subject, defaultDuration }) {
  const [session, setSession] = React.useState({
    session_date: todayIso(),
    planned_duration: subject.duration_per_day || defaultDuration,
    actual_duration: subject.duration_per_day || defaultDuration,
    completed: true,
    notes: ''
  });
  const [edit, setEdit] = React.useState({
    course: subject.course || 'General',
    status: subject.status || 'Active',
    next_review_date: subject.next_review_date || ''
  });
  const addSession = useAddLearningSession();
  const updateSubject = useUpdateLearningSubject();
  const { toast } = useToast();
  const progress = Number(subject.progress?.actual_duration || 0);
  const target = Number(subject.total_duration || 0);
  const pct = target ? Math.min(100, Math.round((progress / target) * 100)) : 0;
  const latest = subject.latest_exam_attempt;

  const logSession = async () => {
    try {
      await addSession.mutateAsync({ subjectId: subject.id, data: session });
      toast('Learning session logged');
    } catch (error) {
      toast(error.message || 'Could not log session', 'error');
    }
  };

  const saveStatus = async () => {
    try {
      await updateSubject.mutateAsync({ subjectId: subject.id, data: edit });
      toast('Study status updated');
    } catch (error) {
      toast(error.message || 'Could not update subject', 'error');
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="muted">{subject.course || 'General'}</Badge>
              <Badge variant={subject.status === 'Mastered' ? 'secondary' : subject.status === 'Review' ? 'amber' : 'default'}>{subject.status}</Badge>
              <Badge variant="muted">{subject.difficulty || 'Intermediate'}</Badge>
            </div>
            <h3 className="text-2xl font-semibold tracking-tight">{subject.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{subject.end_goal || 'No end goal set yet.'}</p>
          </div>
          <div className="min-w-36 border border-border bg-muted/25 p-3">
            <p className="font-mono text-[11px] uppercase text-muted-foreground">Readiness</p>
            <p className="mt-1 text-2xl font-semibold">{Math.round(subject.best_exam_score || 0)}%</p>
            <p className="text-xs text-muted-foreground">Best exam</p>
          </div>
        </div>

        <ProgressBar value={pct} />
        <div className="grid grid-cols-2 border border-border bg-muted/25 sm:grid-cols-4">
          <div className="border-b border-r border-border p-3 sm:border-b-0"><p className="font-mono text-[11px] uppercase text-muted-foreground">Logged</p><p className="text-lg font-semibold">{progress.toFixed(1)}h</p></div>
          <div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="font-mono text-[11px] uppercase text-muted-foreground">Target</p><p className="text-lg font-semibold">{target.toFixed(1)}h</p></div>
          <div className="border-r border-border p-3"><p className="font-mono text-[11px] uppercase text-muted-foreground">Sessions</p><p className="text-lg font-semibold">{subject.progress?.sessions || 0}</p></div>
          <div className="p-3"><p className="font-mono text-[11px] uppercase text-muted-foreground">Next review</p><p className="text-sm font-semibold">{subject.next_review_date || 'Not set'}</p></div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="border border-border bg-muted/20 p-3">
              <p className="mb-2 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Target size={15} /> Success metrics</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {(subject.success_metrics || []).map((metric) => <li key={metric}>- {metric}</li>)}
                {!subject.success_metrics?.length && <li>No success metrics set.</li>}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-border bg-muted/20 p-3">
                <p className="mb-2 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><ListChecks size={15} /> Milestones</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {(subject.milestones || []).map((item) => <li key={item}>- {item}</li>)}
                  {!subject.milestones?.length && <li>No milestones yet.</li>}
                </ul>
              </div>
              <div className="border border-border bg-muted/20 p-3">
                <p className="mb-2 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><FileText size={15} /> Resources</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {(subject.resources || []).map((item) => <li key={item}>- {item}</li>)}
                  {!subject.resources?.length && <li>No resources listed.</li>}
                </ul>
              </div>
            </div>
            {latest && (
              <div className="border border-border bg-muted/20 p-3">
                <p className="mb-2 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {latest.passed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  Last exam
                </p>
                <p className="text-sm font-semibold">{Math.round(latest.score)}% · {latest.feedback}</p>
                {!!latest.review_topics?.length && <p className="mt-2 text-xs text-muted-foreground">Review: {latest.review_topics.join(', ')}</p>}
              </div>
            )}
          </div>

          <div className="space-y-3">
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
              <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Course / status</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input value={edit.course} onChange={(event) => setEdit((current) => ({ ...current, course: event.target.value }))} placeholder="Course" />
                <select className="h-11 border border-input bg-background px-3 text-sm" value={edit.status} onChange={(event) => setEdit((current) => ({ ...current, status: event.target.value }))}>
                  <option>Active</option>
                  <option>Review</option>
                  <option>Mastered</option>
                  <option>Paused</option>
                </select>
                <Input type="date" value={edit.next_review_date || ''} onChange={(event) => setEdit((current) => ({ ...current, next_review_date: event.target.value }))} />
              </div>
              <Button className="mt-2" variant="outline" onClick={saveStatus}>Save status</Button>
            </div>
          </div>
        </div>

        <div className="border border-border bg-muted/20 p-3">
          <p className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><GraduationCap size={15} /> Final assessment</p>
          <ExamPanel subject={subject} />
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
  const [questions, setQuestions] = React.useState(subjectDefaults.exam_questions);
  const [admin, setAdmin] = React.useState({ token: '', default_duration: 1 });
  const defaultDuration = Number(settings.data?.default_duration || 1);
  const subjects = learning.data || [];
  const totalTarget = subjects.reduce((sum, item) => sum + Number(item.total_duration || 0), 0);
  const totalLogged = subjects.reduce((sum, item) => sum + Number(item.progress?.actual_duration || 0), 0);
  const averageExam = subjects.length
    ? Math.round(subjects.reduce((sum, item) => sum + Number(item.best_exam_score || 0), 0) / subjects.length)
    : 0;
  const grouped = subjects.reduce((acc, item) => {
    const course = item.course || 'General';
    acc[course] = acc[course] || [];
    acc[course].push(item);
    return acc;
  }, {});

  React.useEffect(() => {
    setAdmin((current) => ({ ...current, default_duration: defaultDuration }));
  }, [defaultDuration]);

  const updateSubjectDraft = (field, value) => setSubject((current) => ({ ...current, [field]: value }));

  const create = async () => {
    try {
      await createSubject.mutateAsync({
        ...subject,
        success_metrics: listFromText(subject.success_metrics),
        resources: listFromText(subject.resources),
        milestones: listFromText(subject.milestones),
        exam_questions: questions.map(normalizeQuestion)
      });
      setSubject(subjectDefaults);
      setQuestions(subjectDefaults.exam_questions);
      toast('Learning plan created');
    } catch (error) {
      toast(error.message || 'Could not create learning plan', 'error');
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
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><BookOpenCheck size={15} /> Learning management</p>
            <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Study contract and exam room</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Define the course, end goal, success metrics, study plan, resources, milestones, and final test you must pass to prove mastery.
            </p>
          </div>
          <Badge variant="muted">Default {defaultDuration}h/day</Badge>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card><CardContent className="p-4"><p className="font-mono text-[11px] uppercase text-muted-foreground">Plans</p><p className="mt-1 text-2xl font-semibold">{subjects.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="font-mono text-[11px] uppercase text-muted-foreground">Logged</p><p className="mt-1 text-2xl font-semibold">{totalLogged.toFixed(1)}h</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="font-mono text-[11px] uppercase text-muted-foreground">Target</p><p className="mt-1 text-2xl font-semibold">{totalTarget.toFixed(1)}h</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="flex items-center gap-2 font-mono text-[11px] uppercase text-muted-foreground"><BarChart3 size={14} /> Exam avg</p><p className="mt-1 text-2xl font-semibold">{averageExam}%</p></CardContent></Card>
        </div>

        <div className="mb-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Plan builder</p>
                <h3 className="text-xl font-semibold tracking-tight">Create a study contract</h3>
              </div>
              <div className="grid gap-3 lg:grid-cols-[180px_1fr_150px]">
                <Input value={subject.course} onChange={(event) => updateSubjectDraft('course', event.target.value)} placeholder="Course / group" />
                <Input value={subject.title} onChange={(event) => updateSubjectDraft('title', event.target.value)} placeholder="Subject matter" />
                <select className="h-11 border border-input bg-background px-3 text-sm" value={subject.difficulty} onChange={(event) => updateSubjectDraft('difficulty', event.target.value)}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <Textarea value={subject.end_goal} onChange={(event) => updateSubjectDraft('end_goal', event.target.value)} placeholder="End goal: what must be true before you can say you learned this?" />
              <Textarea value={subject.success_metrics} onChange={(event) => updateSubjectDraft('success_metrics', event.target.value)} placeholder="Success metrics, one per line. Example: Explain OAuth flows without notes." />
              <Textarea value={subject.learning_plan} onChange={(event) => updateSubjectDraft('learning_plan', event.target.value)} placeholder="Study plan: what you will read, build, practice, review..." />
              <div className="grid gap-3 lg:grid-cols-2">
                <Textarea value={subject.resources} onChange={(event) => updateSubjectDraft('resources', event.target.value)} placeholder="Resources, one per line" />
                <Textarea value={subject.milestones} onChange={(event) => updateSubjectDraft('milestones', event.target.value)} placeholder="Milestones, one per line" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input type="number" min="0" step="0.5" value={subject.total_duration} onChange={(event) => updateSubjectDraft('total_duration', event.target.value)} placeholder="Total hours" />
                <Input type="number" min="0" step="0.25" value={subject.duration_per_day} onChange={(event) => updateSubjectDraft('duration_per_day', event.target.value)} placeholder={`Daily h (${defaultDuration})`} />
                <Input type="number" min="1" value={subject.exam_duration_minutes} onChange={(event) => updateSubjectDraft('exam_duration_minutes', event.target.value)} placeholder="Exam minutes" />
                <Input type="number" min="1" max="100" value={subject.pass_score} onChange={(event) => updateSubjectDraft('pass_score', event.target.value)} placeholder="Pass %" />
              </div>
              <QuestionBuilder questions={questions} setQuestions={setQuestions} />
              <Button onClick={create} disabled={createSubject.isPending}>
                <Plus size={17} />
                Create learning plan
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Settings2 size={18} /> Admin default</h3>
                <p className="text-sm leading-6 text-muted-foreground">Default daily learning duration is used unless a plan overrides it.</p>
                <Input type="number" min="0" step="0.25" value={admin.default_duration} onChange={(event) => setAdmin((current) => ({ ...current, default_duration: event.target.value }))} />
                <Input type="password" value={admin.token} onChange={(event) => setAdmin((current) => ({ ...current, token: event.target.value }))} placeholder="Back-office token" />
                <Button variant="outline" onClick={saveSettings}>Save default</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Layers size={18} /> Courses</h3>
                {Object.entries(grouped).length ? Object.entries(grouped).map(([course, items]) => (
                  <div key={course} className="flex items-center justify-between border border-border bg-muted/20 p-3">
                    <span className="font-semibold">{course}</span>
                    <Badge variant="muted">{items.length}</Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No courses yet.</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {learning.isLoading ? (
            <div className="skeleton h-40 rounded-lg" />
          ) : Object.entries(grouped).length ? (
            Object.entries(grouped).map(([course, items]) => (
              <div key={course} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Layers size={17} className="text-primary" />
                  <h3 className="text-xl font-semibold tracking-tight">{course}</h3>
                </div>
                {items.map((item) => <SubjectCard key={item.id} subject={item} defaultDuration={defaultDuration} />)}
              </div>
            ))
          ) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No learning plans yet.</CardContent></Card>
          )}
        </div>
      </div>
    </section>
  );
}
