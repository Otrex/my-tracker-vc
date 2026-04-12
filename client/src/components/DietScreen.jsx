import React from 'react';
import { addDays, format, parseISO } from 'date-fns';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Plus,
  Save,
  Target,
  Trash2,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateDietEntry,
  useDeleteDietEntry,
  useDiet,
  useDietGoals,
  useDietWeek,
  useUpdateDietEntry,
  useUpdateDietGoals
} from '@/hooks/useDiet';
import { useToast } from '@/components/ui/toast';

function iso(date) {
  return format(date, 'yyyy-MM-dd');
}

function mondayOf(dateValue) {
  const date = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  const diff = (date.getDay() + 6) % 7;
  return iso(addDays(date, -diff));
}

function percent(value, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(value || 0) / Number(goal || 0)) * 100)));
}

function numberValue(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  return Number(value);
}

const emptyEntry = {
  meal_type: 'Breakfast',
  meal_time: '',
  food: '',
  serving: '',
  source: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium_mg: 0,
  water_liters: 0,
  hunger_before: 5,
  energy_after: 5,
  tags_text: '',
  notes: ''
};

const goalDefaults = {
  calorie_goal: 2200,
  protein_goal: 120,
  carbs_goal: 240,
  fat_goal: 70,
  fiber_goal: 30,
  water_goal: 2.5,
  notes: ''
};

const mealTypes = ['Breakfast', 'Snack', 'Lunch', 'Dinner', 'Hydration', 'Supplement'];

function entryToDraft(entry) {
  return {
    ...emptyEntry,
    ...entry,
    tags_text: Array.isArray(entry.tags) ? entry.tags.join(', ') : entry.tags || ''
  };
}

function entryPayload(draft, entryDate) {
  return {
    entry_date: entryDate || draft.entry_date,
    meal_type: draft.meal_type,
    meal_time: draft.meal_time,
    food: draft.food,
    serving: draft.serving,
    source: draft.source,
    calories: numberValue(draft.calories),
    protein: numberValue(draft.protein),
    carbs: numberValue(draft.carbs),
    fat: numberValue(draft.fat),
    fiber: numberValue(draft.fiber),
    sugar: numberValue(draft.sugar),
    sodium_mg: numberValue(draft.sodium_mg),
    water_liters: numberValue(draft.water_liters),
    hunger_before: numberValue(draft.hunger_before, 5),
    energy_after: numberValue(draft.energy_after, 5),
    tags: draft.tags_text,
    notes: draft.notes
  };
}

function Field({ label, children }) {
  return (
    <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ProgressStat({ icon: Icon, label, value, goal, unit, tone = 'primary' }) {
  const progress = percent(value, goal);
  const toneClass = tone === 'green' ? 'bg-secondary' : tone === 'blue' ? 'bg-sky-400' : 'bg-primary';

  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <Icon size={17} className="text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">
        {Number(value || 0).toFixed(unit === 'L' ? 1 : 0)}
        <span className="ml-1 text-sm text-muted-foreground">/ {Number(goal || 0).toFixed(unit === 'L' ? 1 : 0)}{unit}</span>
      </p>
      <div className="mt-3 h-2 border border-border bg-muted">
        <div className={`h-full ${toneClass} transition-all`} style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{progress}% of goal</p>
    </div>
  );
}

function MacroLine({ label, value, goal, color }) {
  const width = percent(value, goal);

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">{Math.round(value || 0)} / {Math.round(goal || 0)}g</span>
      </div>
      <div className="h-2 border border-border bg-muted">
        <div className={color} style={{ width: `${width}%`, height: '100%' }} />
      </div>
    </div>
  );
}

function WeeklyStrip({ week }) {
  const days = week.data?.days || [];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Week rhythm</p>
            <h3 className="text-xl font-semibold tracking-tight">Nutrition consistency</h3>
          </div>
          <CalendarDays size={19} className="text-primary" />
        </div>
        {week.isLoading ? (
          <div className="skeleton h-28" />
        ) : (
          <div className="grid grid-cols-7 items-end gap-2">
            {days.map((day) => {
              const calories = day.summary?.calories || 0;
              const calorieGoal = day.goals?.calories || 1;
              const water = day.summary?.water_liters || 0;
              const height = Math.max(12, percent(calories, calorieGoal));
              return (
                <div key={day.date} className="space-y-2 text-center">
                  <div className="flex h-28 items-end justify-center border border-border bg-muted/40 p-1">
                    <div className="w-full bg-primary transition-all" style={{ height: `${height}%` }} />
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground">{format(parseISO(day.date), 'EEE')}</p>
                  <p className="text-[10px] text-muted-foreground">{water.toFixed(1)}L</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalsPanel({ goals }) {
  const [draft, setDraft] = React.useState(goalDefaults);
  const updateGoals = useUpdateDietGoals();
  const { toast } = useToast();

  React.useEffect(() => {
    if (goals.data) setDraft({ ...goalDefaults, ...goals.data });
  }, [goals.data]);

  const save = async () => {
    try {
      await updateGoals.mutateAsync(draft);
      toast('Diet goals updated');
    } catch (error) {
      toast(error.message || 'Could not update diet goals', 'error');
    }
  };

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Daily targets</p>
            <h3 className="text-xl font-semibold tracking-tight">Goal settings</h3>
          </div>
          <Target size={19} className="text-primary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Calories"><Input type="number" min="0" value={draft.calorie_goal} onChange={(event) => update('calorie_goal', event.target.value)} /></Field>
          <Field label="Protein g"><Input type="number" min="0" value={draft.protein_goal} onChange={(event) => update('protein_goal', event.target.value)} /></Field>
          <Field label="Carbs g"><Input type="number" min="0" value={draft.carbs_goal} onChange={(event) => update('carbs_goal', event.target.value)} /></Field>
          <Field label="Fat g"><Input type="number" min="0" value={draft.fat_goal} onChange={(event) => update('fat_goal', event.target.value)} /></Field>
          <Field label="Fiber g"><Input type="number" min="0" value={draft.fiber_goal} onChange={(event) => update('fiber_goal', event.target.value)} /></Field>
          <Field label="Water L"><Input type="number" min="0" step="0.1" value={draft.water_goal} onChange={(event) => update('water_goal', event.target.value)} /></Field>
        </div>
        <Textarea className="mt-3" rows={2} value={draft.notes || ''} onChange={(event) => update('notes', event.target.value)} placeholder="Diet focus, allergies, meal prep reminders..." />
        <Button className="mt-3 w-full sm:w-auto" onClick={save} disabled={updateGoals.isPending}>
          <Save size={16} />
          {updateGoals.isPending ? 'Saving goals...' : 'Save goals'}
        </Button>
      </CardContent>
    </Card>
  );
}

function AddMealForm({ date, onAdd, isPending }) {
  const [draft, setDraft] = React.useState(emptyEntry);

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    await onAdd(entryPayload(draft, date));
    setDraft(emptyEntry);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Meal capture</p>
          <h3 className="text-xl font-semibold tracking-tight">Add food, water, or supplement</h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-[150px_120px_1fr_130px]">
          <Field label="Meal">
            <select className="h-11 w-full border border-input bg-background px-3 text-sm" value={draft.meal_type} onChange={(event) => update('meal_type', event.target.value)}>
              {mealTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Time"><Input type="time" value={draft.meal_time} onChange={(event) => update('meal_time', event.target.value)} /></Field>
          <Field label="Food"><Input value={draft.food} onChange={(event) => update('food', event.target.value)} placeholder="Greek yogurt, oats, banana..." /></Field>
          <Field label="Serving"><Input value={draft.serving} onChange={(event) => update('serving', event.target.value)} placeholder="1 bowl" /></Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Calories"><Input type="number" min="0" value={draft.calories} onChange={(event) => update('calories', event.target.value)} /></Field>
          <Field label="Protein g"><Input type="number" min="0" value={draft.protein} onChange={(event) => update('protein', event.target.value)} /></Field>
          <Field label="Carbs g"><Input type="number" min="0" value={draft.carbs} onChange={(event) => update('carbs', event.target.value)} /></Field>
          <Field label="Fat g"><Input type="number" min="0" value={draft.fat} onChange={(event) => update('fat', event.target.value)} /></Field>
          <Field label="Fiber g"><Input type="number" min="0" value={draft.fiber} onChange={(event) => update('fiber', event.target.value)} /></Field>
          <Field label="Sugar g"><Input type="number" min="0" value={draft.sugar} onChange={(event) => update('sugar', event.target.value)} /></Field>
          <Field label="Sodium mg"><Input type="number" min="0" value={draft.sodium_mg} onChange={(event) => update('sodium_mg', event.target.value)} /></Field>
          <Field label="Water L"><Input type="number" min="0" step="0.1" value={draft.water_liters} onChange={(event) => update('water_liters', event.target.value)} /></Field>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_120px_120px]">
          <Field label="Source"><Input value={draft.source} onChange={(event) => update('source', event.target.value)} placeholder="Home, restaurant, meal prep" /></Field>
          <Field label="Tags"><Input value={draft.tags_text} onChange={(event) => update('tags_text', event.target.value)} placeholder="high-protein, low-sugar" /></Field>
          <Field label="Hunger 0-10"><Input type="number" min="0" max="10" value={draft.hunger_before} onChange={(event) => update('hunger_before', event.target.value)} /></Field>
          <Field label="Energy 0-10"><Input type="number" min="0" max="10" value={draft.energy_after} onChange={(event) => update('energy_after', event.target.value)} /></Field>
        </div>
        <Textarea className="mt-3" rows={2} value={draft.notes} onChange={(event) => update('notes', event.target.value)} placeholder="How did it feel? Cravings, timing, digestion, mood..." />
        <Button className="mt-3 w-full sm:w-auto" onClick={submit} disabled={isPending || !draft.food.trim()}>
          <Plus size={17} />
          {isPending ? 'Adding...' : 'Add entry'}
        </Button>
      </CardContent>
    </Card>
  );
}

function DietRow({ entry }) {
  const [draft, setDraft] = React.useState(entryToDraft(entry));
  const updateEntry = useUpdateDietEntry();
  const deleteEntry = useDeleteDietEntry();
  const { toast } = useToast();

  React.useEffect(() => {
    setDraft(entryToDraft(entry));
  }, [entry]);

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const save = async () => {
    try {
      await updateEntry.mutateAsync({ id: entry.id, data: entryPayload(draft) });
      toast('Food entry updated');
    } catch (error) {
      toast(error.message || 'Could not update food entry', 'error');
    }
  };

  const remove = async () => {
    try {
      await deleteEntry.mutateAsync({ id: entry.id, entry_date: entry.entry_date });
      toast('Food entry removed');
    } catch (error) {
      toast(error.message || 'Could not remove food entry', 'error');
    }
  };

  return (
    <div className="grid gap-3 border-b border-border p-3 last:border-b-0 xl:grid-cols-[110px_90px_1.4fr_88px_88px_88px_88px_120px] xl:items-start">
      <Field label="Meal">
        <Input value={draft.meal_type} onChange={(event) => update('meal_type', event.target.value)} />
      </Field>
      <Field label="Time">
        <Input type="time" value={draft.meal_time || ''} onChange={(event) => update('meal_time', event.target.value)} />
      </Field>
      <div className="space-y-2">
        <Field label="Food"><Input value={draft.food} onChange={(event) => update('food', event.target.value)} /></Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={draft.serving || ''} onChange={(event) => update('serving', event.target.value)} placeholder="Serving" />
          <Input value={draft.tags_text || ''} onChange={(event) => update('tags_text', event.target.value)} placeholder="Tags" />
        </div>
        <Textarea rows={2} value={draft.notes || ''} onChange={(event) => update('notes', event.target.value)} placeholder="Notes" />
      </div>
      <Field label="Cal"><Input type="number" min="0" value={draft.calories} onChange={(event) => update('calories', event.target.value)} /></Field>
      <Field label="Protein"><Input type="number" min="0" value={draft.protein} onChange={(event) => update('protein', event.target.value)} /></Field>
      <Field label="Carbs"><Input type="number" min="0" value={draft.carbs} onChange={(event) => update('carbs', event.target.value)} /></Field>
      <Field label="Water"><Input type="number" min="0" step="0.1" value={draft.water_liters} onChange={(event) => update('water_liters', event.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
        <Button size="sm" onClick={save} disabled={updateEntry.isPending}>
          <Save size={15} />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={remove} disabled={deleteEntry.isPending}>
          <Trash2 size={15} />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function DietScreen() {
  const [date, setDate] = React.useState(() => iso(new Date()));
  const weekStart = mondayOf(date);
  const diet = useDiet(date);
  const week = useDietWeek(weekStart);
  const goals = useDietGoals();
  const createEntry = useCreateDietEntry();
  const { toast } = useToast();

  const entries = diet.data?.entries || [];
  const summary = diet.data?.summary || {};
  const dailyGoals = diet.data?.goals || {
    calories: goals.data?.calorie_goal || goalDefaults.calorie_goal,
    protein: goals.data?.protein_goal || goalDefaults.protein_goal,
    carbs: goals.data?.carbs_goal || goalDefaults.carbs_goal,
    fat: goals.data?.fat_goal || goalDefaults.fat_goal,
    fiber: goals.data?.fiber_goal || goalDefaults.fiber_goal,
    water_liters: goals.data?.water_goal || goalDefaults.water_goal
  };

  const addEntry = async (payload) => {
    try {
      await createEntry.mutateAsync(payload);
      toast('Diet entry added');
    } catch (error) {
      toast(error.message || 'Could not add diet entry', 'error');
      throw error;
    }
  };

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Utensils size={15} />
              Nutrition workspace
            </p>
            <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Diet dashboard</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track meals, macro balance, water, hunger, energy, and weekly consistency from one clean view.
            </p>
          </div>
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDate((current) => iso(addDays(parseISO(current), -1)))}>
              <ChevronLeft size={18} />
            </Button>
            <div className="border border-border bg-card px-3 py-2 text-center text-sm font-semibold">{format(parseISO(date), 'EEE, MMM d, yyyy')}</div>
            <Button variant="outline" size="icon" onClick={() => setDate((current) => iso(addDays(parseISO(current), 1)))}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ProgressStat icon={Flame} label="Calories" value={summary.calories} goal={dailyGoals.calories} unit="" />
          <ProgressStat icon={Activity} label="Protein" value={summary.protein} goal={dailyGoals.protein} unit="g" tone="green" />
          <ProgressStat icon={Target} label="Carbs" value={summary.carbs} goal={dailyGoals.carbs} unit="g" />
          <ProgressStat icon={Droplets} label="Water" value={summary.water_liters} goal={dailyGoals.water_liters} unit="L" tone="blue" />
        </div>

        <div className="mb-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Macro balance</p>
                  <h3 className="text-xl font-semibold tracking-tight">Today’s nutrition shape</h3>
                </div>
                <Badge variant="muted">{entries.length} entries</Badge>
              </div>
              <div className="space-y-4">
                <MacroLine label="Protein" value={summary.protein} goal={dailyGoals.protein} color="bg-secondary" />
                <MacroLine label="Carbs" value={summary.carbs} goal={dailyGoals.carbs} color="bg-primary" />
                <MacroLine label="Fat" value={summary.fat} goal={dailyGoals.fat} color="bg-amber-400" />
                <MacroLine label="Fiber" value={summary.fiber} goal={dailyGoals.fiber} color="bg-emerald-300" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Sugar</p>
                  <p className="mt-1 text-lg font-semibold">{Math.round(summary.sugar || 0)}g</p>
                </div>
                <div className="border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Sodium</p>
                  <p className="mt-1 text-lg font-semibold">{Math.round(summary.sodium_mg || 0)}mg</p>
                </div>
                <div className="border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Hunger / Energy</p>
                  <p className="mt-1 text-lg font-semibold">{summary.hunger_before || 0} / {summary.energy_after || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <WeeklyStrip week={week} />
        </div>

        <div className="mb-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <GoalsPanel goals={goals} />
          <AddMealForm date={date} onAdd={addEntry} isPending={createEntry.isPending} />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="hidden grid-cols-[110px_90px_1.4fr_88px_88px_88px_88px_120px] gap-3 border-b border-border bg-muted/25 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground xl:grid">
              <span>Meal</span>
              <span>Time</span>
              <span>Food, serving, notes</span>
              <span>Cal</span>
              <span>Protein</span>
              <span>Carbs</span>
              <span>Water</span>
              <span>Action</span>
            </div>
            {diet.isLoading ? (
              <div className="p-4">
                <div className="skeleton h-28" />
              </div>
            ) : entries.length ? (
              entries.map((entry) => <DietRow key={entry.id} entry={entry} />)
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No entries yet. Add your first meal, water check, or supplement above.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
