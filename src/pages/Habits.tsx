/**
 * Habits: today's list, full CRUD, the pack library and per-habit detail
 * with history charts.
 */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DayOfWeek, Habit, HabitCategory, HabitIntensity } from '@/types';
import { useHabits } from '@/hooks/useGame';
import { PageShell } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, FieldError } from '@/components/ui/input';
import { Badge, EmptyState, Progress, Switch } from '@/components/ui/misc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarDivider } from '@/components/common/StarDivider';
import { CATEGORY_COLORS, CATEGORY_LABELS, IntensityPips } from '@/components/battle/MoveButton';
import { HABIT_PACKS } from '@/game/habits/packs';
import { INTENSITY_LEVELS, intensityHint, intensityLabel } from '@/game/habits/intensity';
import { completionRate, completionsByWeekday, computeHabitStreak } from '@/game/habits/streaks';
import { today as todayISO } from '@/lib/date';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const CATEGORIES: HabitCategory[] = [
  'faith',
  'intelligence',
  'strength',
  'charisma',
  'discipline',
  'bad_habit',
];

const habitSchema = z.object({
  name: z.string().min(2, 'At least 2 characters.').max(50, 'At most 50 characters.'),
  description: z.string().max(200, 'At most 200 characters.').optional(),
  category: z.enum(['faith', 'intelligence', 'strength', 'charisma', 'discipline', 'bad_habit']),
  intensity: z.coerce.number().min(1).max(5),
  frequency_type: z.enum(['daily', 'x_per_week', 'custom_days']),
  frequency_value: z.coerce.number().min(1).max(7),
  cue_time: z.string().optional(),
  cue_trigger: z.string().max(60).optional(),
});

type HabitForm = z.infer<typeof habitSchema>;

export default function HabitsPage() {
  const { habits, logs, todayHabits, addHabit, updateHabit, deleteHabit, toggleHabitActive } =
    useHabits();

  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Habit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);

  const activeCount = habits.filter((h) => h.is_active).length;

  return (
    <PageShell
      title="Habits"
      subtitle={
        habits.length === 0
          ? 'Habits are your moves. Add as many as you will actually keep.'
          : `${activeCount} active of ${habits.length} · no limit`
      }
      action={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Add
        </Button>
      }
    >
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="all">All habits</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        {/* Today ------------------------------------------------------ */}
        <TabsContent value="today">
          {todayHabits.length === 0 ? (
            <EmptyState
              title="Nothing scheduled today"
              description="Either you have no habits yet, or none are set for today's weekday."
              action={<Button onClick={() => setCreating(true)}>Add your first habit</Button>}
            />
          ) : (
            <div className="space-y-2">
              {todayHabits.map(({ habit, completed }) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  completed={completed}
                  onEdit={() => setEditing(habit)}
                  onDelete={() => setConfirmDelete(habit)}
                  onDetail={() => setDetail(habit)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All -------------------------------------------------------- */}
        <TabsContent value="all">
          {habits.length === 0 ? (
            <EmptyState
              title="No habits yet"
              description="Habits are your moves. Without them there is nothing to strike with."
              action={<Button onClick={() => setCreating(true)}>Add a habit</Button>}
            />
          ) : (
            <div className="space-y-2">
              {habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  completed={false}
                  showToggle
                  onToggle={() => toggleHabitActive(habit.id)}
                  onEdit={() => setEditing(habit)}
                  onDelete={() => setConfirmDelete(habit)}
                  onDetail={() => setDetail(habit)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Library ---------------------------------------------------- */}
        <TabsContent value="library">
          <p className="mb-4 text-sm text-muted">
            Pre-made habits, ready to add. Tap any one to put it in your roster.
          </p>

          {HABIT_PACKS.map((pack) => (
            <div key={pack.id} className="mb-6">
              <StarDivider label={pack.name} />
              <p className="mb-3 text-center text-xs text-muted">{pack.description}</p>

              <div className="grid gap-2 sm:grid-cols-2">
                {pack.habits.map((template) => {
                  const owned = habits.some((h) => h.name === template.name);
                  const color = CATEGORY_COLORS[template.category];

                  return (
                    <button
                      key={template.name}
                      type="button"
                      disabled={owned}
                      onClick={() => {
                        addHabit({
                          name: template.name,
                          category: template.category,
                          intensity: template.intensity,
                          cue_trigger: template.cue_trigger ?? null,
                          description: template.description,
                        });
                        toast.success(`${template.name} added.`);
                      }}
                      className={cn(
                        'panel flex items-center justify-between gap-2 p-3 text-left transition-all',
                        owned ? 'opacity-45' : 'hover:border-gold/50',
                      )}
                      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-bone">{template.name}</p>
                        <div className="mt-1">
                          <IntensityPips value={template.intensity} color={color} />
                        </div>
                      </div>
                      {owned ? (
                        <Check className="size-4 shrink-0 text-emerald" />
                      ) : (
                        <Plus className="size-4 shrink-0 text-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Create / edit */}
      <HabitFormDialog
        open={creating || Boolean(editing)}
        habit={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(values) => {
          if (editing) {
            updateHabit(editing.id, {
              ...values,
              intensity: values.intensity as HabitIntensity,
              description: values.description || null,
              cue_time: values.cue_time || null,
              cue_trigger: values.cue_trigger || null,
            });
            toast.success('Habit updated.');
          } else {
            addHabit({
              ...values,
              intensity: values.intensity as HabitIntensity,
              cue_time: values.cue_time || null,
              cue_trigger: values.cue_trigger || null,
            });
            toast.success('Habit added.');
          }
          setCreating(false);
          setEditing(null);
        }}
      />

      {/* Detail */}
      <HabitDetailDialog habit={detail} logs={logs} onClose={() => setDetail(null)} />

      {/* Delete confirmation */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retire this habit?</DialogTitle>
            <DialogDescription>
              &ldquo;{confirmDelete?.name}&rdquo; and its {confirmDelete?.total_completions ?? 0}{' '}
              logged completions will be removed. Your XP, coins and zone progress are unaffected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) {
                  deleteHabit(confirmDelete.id);
                  toast.success('Habit retired.');
                }
                setConfirmDelete(null);
              }}
            >
              Retire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function HabitRow({
  habit,
  completed,
  showToggle = false,
  onToggle,
  onEdit,
  onDelete,
  onDetail,
}: {
  habit: Habit;
  completed: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDetail?: () => void;
}) {
  const color = CATEGORY_COLORS[habit.category];

  return (
    <div
      className={cn('panel flex items-center gap-3 p-3', !habit.is_active && 'opacity-50')}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <button type="button" onClick={onDetail} className="min-w-0 flex-1 text-left">
        <div className="flex items-baseline gap-2">
          <p className="truncate font-display text-sm text-bone">{habit.name}</p>
          {completed && <Check className="size-3.5 shrink-0 text-emerald" />}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <IntensityPips value={habit.intensity} color={color} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color }}>
            {CATEGORY_LABELS[habit.category]}
          </span>
          {habit.streak > 0 && (
            <Badge variant="gold">{habit.streak}d</Badge>
          )}
          {habit.cue_trigger && (
            <span className="text-[10px] text-muted">· {habit.cue_trigger}</span>
          )}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {showToggle && onToggle && (
          <Switch
            checked={habit.is_active}
            onCheckedChange={onToggle}
            aria-label={`${habit.is_active ? 'Pause' : 'Resume'} ${habit.name}`}
          />
        )}

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${habit.name}`}
            title="Edit"
            className="flex size-9 items-center justify-center rounded-lg border border-edge text-muted transition-colors hover:border-gold/60 hover:text-gold"
          >
            <Pencil className="size-4" />
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${habit.name}`}
            title="Delete this habit"
            className="flex size-9 items-center justify-center rounded-lg border border-danger/40 text-danger/80 transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

const WEEKDAYS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
];

function HabitFormDialog({
  open,
  habit,
  onClose,
  onSubmit,
}: {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSubmit: (values: HabitForm & { days_of_week: DayOfWeek[] }) => void;
}) {
  const [days, setDays] = useState<DayOfWeek[]>(habit?.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]);

  const form = useForm<HabitForm>({
    resolver: zodResolver(habitSchema),
    values: {
      name: habit?.name ?? '',
      description: habit?.description ?? '',
      category: habit?.category ?? 'faith',
      intensity: habit?.intensity ?? 3,
      frequency_type: habit?.frequency_type ?? 'daily',
      frequency_value: habit?.frequency_value ?? 7,
      cue_time: habit?.cue_time ?? '',
      cue_trigger: habit?.cue_trigger ?? '',
    },
  });

  const category = form.watch('category');
  const intensity = form.watch('intensity') as HabitIntensity;
  const frequencyType = form.watch('frequency_type');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{habit ? 'Edit habit' : 'New habit'}</DialogTitle>
          <DialogDescription>
            {category === 'bad_habit'
              ? 'Resistance habits reward you for NOT doing something. They pay triple and raise Defense.'
              : 'Every completion fires as a move against the current monster.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) => onSubmit({ ...values, days_of_week: days }))}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="habit-name">Name</Label>
            <Input id="habit-name" {...form.register('name')} placeholder="Fajr prayer" />
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="habit-desc">Description (optional)</Label>
            <Textarea
              id="habit-desc"
              rows={2}
              {...form.register('description')}
              placeholder="Why this matters to you."
            />
            <FieldError>{form.formState.errors.description?.message}</FieldError>
          </div>

          <div>
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => form.setValue('category', c)}
                  aria-pressed={category === c}
                  className={cn(
                    'rounded-lg border py-2 text-[11px] transition-all',
                    category === c
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-edge text-muted hover:border-gold/40',
                  )}
                  style={category === c ? { borderColor: CATEGORY_COLORS[c] } : undefined}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Intensity — {intensityLabel(intensity)}</Label>
            <div className="flex gap-1.5">
              {INTENSITY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => form.setValue('intensity', level)}
                  aria-pressed={intensity === level}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-xs transition-all',
                    intensity === level
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-edge text-muted hover:border-gold/40',
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">{intensityHint(intensity)}</p>
          </div>

          <div>
            <Label>Frequency</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['daily', 'x_per_week', 'custom_days'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => form.setValue('frequency_type', f)}
                  aria-pressed={frequencyType === f}
                  className={cn(
                    'rounded-lg border py-2 text-[11px] transition-all',
                    frequencyType === f
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-edge text-muted hover:border-gold/40',
                  )}
                >
                  {f === 'daily' ? 'Daily' : f === 'x_per_week' ? 'X / week' : 'Set days'}
                </button>
              ))}
            </div>
          </div>

          {frequencyType === 'x_per_week' && (
            <div>
              <Label htmlFor="freq-value">Times per week</Label>
              <Input
                id="freq-value"
                type="number"
                min={1}
                max={7}
                className="max-w-[100px]"
                {...form.register('frequency_value')}
              />
            </div>
          )}

          {frequencyType === 'custom_days' && (
            <div>
              <Label>Days</Label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((d, i) => {
                  const on = days.includes(d.value);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setDays((prev) =>
                          on ? prev.filter((x) => x !== d.value) : [...prev, d.value],
                        )
                      }
                      aria-pressed={on}
                      className={cn(
                        'size-9 rounded-lg border text-xs transition-all',
                        on
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-edge text-muted hover:border-gold/40',
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cue-time">Reminder time</Label>
              <Input id="cue-time" type="time" {...form.register('cue_time')} />
            </div>
            <div>
              <Label htmlFor="cue-trigger">Cue</Label>
              <Input id="cue-trigger" placeholder="After Fajr" {...form.register('cue_trigger')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{habit ? 'Save changes' : 'Add habit'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function HabitDetailDialog({
  habit,
  logs,
  onClose,
}: {
  habit: Habit | null;
  logs: ReturnType<typeof useHabits>['logs'];
  onClose: () => void;
}) {
  const date = todayISO();

  const data = useMemo(() => {
    if (!habit) return [];
    const buckets = completionsByWeekday(logs, habit.id);
    return WEEKDAY_NAMES.map((name, i) => ({ day: name, count: buckets[i] }));
  }, [habit, logs]);

  if (!habit) return null;

  const rate = completionRate(habit, logs, date, 30);
  const streak = computeHabitStreak(logs, habit.id, date);
  const color = CATEGORY_COLORS[habit.category];
  const best = data.reduce((a, b) => (b.count > a.count ? b : a), data[0] ?? { day: '—', count: 0 });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <p className="heading-rule" style={{ color }}>
            {CATEGORY_LABELS[habit.category]}
          </p>
          <DialogTitle>{habit.name}</DialogTitle>
          {habit.description && <DialogDescription>{habit.description}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Current streak" value={`${streak}d`} />
          <Stat label="Longest" value={`${habit.longest_streak}d`} />
          <Stat label="Total" value={String(habit.total_completions)} />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="heading-rule">30-day completion</span>
            <span className="tabular text-sm text-gold">{formatPercent(rate)}</span>
          </div>
          <Progress value={rate} />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-muted" />
            <span className="heading-rule">By weekday</span>
          </div>

          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3348" vertical={false} />
                <XAxis dataKey="day" stroke="#A8B0C0" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#A8B0C0" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip
                  cursor={{ fill: '#1A2030' }}
                  contentStyle={{
                    background: '#1A2030',
                    border: '1px solid #2A3348',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {best.count > 0 && (
            <p className="mt-2 text-xs text-muted">
              Your strongest day is <span className="text-bone">{best.day}</span> with {best.count}{' '}
              completions.
            </p>
          )}
        </div>

        <Button variant="secondary" size="block" className="mt-5" onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-inset p-2.5 text-center">
      <p className="tabular font-display text-lg text-bone">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
