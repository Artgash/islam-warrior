/**
 * Streak bookkeeping: daily streaks, per-habit streaks, scheduling and the
 * "perfect week/month" checks the achievement system reads.
 */

import type { DayOfWeek, Habit, HabitLog, ISODate } from '@/types';
import { RESIST_LEGENDARY_DAYS, RESIST_SHIELD_DAYS } from '@/game/constants';

/* ------------------------------------------------------------------ */
/* Date helpers (string-based, timezone-free by design)                */
/* ------------------------------------------------------------------ */

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function dayDiff(from: ISODate, to: ISODate): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function dayOfWeek(date: ISODate): DayOfWeek {
  return parseISODate(date).getDay() as DayOfWeek;
}

/** ISO week key, e.g. `2026-W39`. Used for weekly leaderboards and quests. */
export function isoWeekKey(date: ISODate): string {
  const d = parseISODate(date);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const week = 1 + Math.round((target.valueOf() - firstThursday.valueOf()) / (7 * 86_400_000));
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

/** The Monday that opens the ISO week containing `date`. */
export function startOfIsoWeek(date: ISODate): ISODate {
  const dow = dayOfWeek(date);
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDays(date, offset);
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

/** Is this habit scheduled for the given day? */
export function isScheduledOn(habit: Habit, date: ISODate): boolean {
  if (!habit.is_active) return false;

  switch (habit.frequency_type) {
    case 'daily':
      return true;
    case 'custom_days':
      return habit.days_of_week.includes(dayOfWeek(date));
    case 'x_per_week':
      // Flexible target: always offered, progress tracked across the week.
      return true;
  }
}

/** Completions of a habit within the ISO week containing `date`. */
export function weeklyCompletions(logs: HabitLog[], habitId: string, date: ISODate): number {
  const week = isoWeekKey(date);
  return logs.filter((l) => l.habit_id === habitId && isoWeekKey(l.date) === week).length;
}

/** Has an `x_per_week` habit already hit its target this week? */
export function hasMetWeeklyTarget(habit: Habit, logs: HabitLog[], date: ISODate): boolean {
  if (habit.frequency_type !== 'x_per_week') return false;
  return weeklyCompletions(logs, habit.id, date) >= habit.frequency_value;
}

/* ------------------------------------------------------------------ */
/* Completion checks                                                   */
/* ------------------------------------------------------------------ */

export function wasCompletedOn(logs: HabitLog[], habitId: string, date: ISODate): boolean {
  return logs.some((l) => l.habit_id === habitId && l.date === date);
}

export function completionsOn(logs: HabitLog[], date: ISODate): HabitLog[] {
  return logs.filter((l) => l.date === date);
}

/** The combo count for a day — one per completed habit. */
export function comboCountFor(logs: HabitLog[], date: ISODate): number {
  return completionsOn(logs, date).length;
}

/* ------------------------------------------------------------------ */
/* Streaks                                                             */
/* ------------------------------------------------------------------ */

export interface StreakUpdate {
  streak: number;
  longest_streak: number;
  /** True when this completion extended rather than restarted the streak. */
  continued: boolean;
  broken: boolean;
}

/**
 * Update a streak given the last active date and today.
 * A same-day repeat is a no-op; a one-day gap continues; more breaks it.
 */
export function updateStreak(
  currentStreak: number,
  longestStreak: number,
  lastDate: ISODate | null,
  today: ISODate,
  streakFrozen = false,
): StreakUpdate {
  if (lastDate === today) {
    return { streak: currentStreak, longest_streak: longestStreak, continued: true, broken: false };
  }

  if (!lastDate) {
    return { streak: 1, longest_streak: Math.max(1, longestStreak), continued: false, broken: false };
  }

  const gap = dayDiff(lastDate, today);

  if (gap === 1 || (streakFrozen && gap === 2)) {
    const streak = currentStreak + 1;
    return {
      streak,
      longest_streak: Math.max(streak, longestStreak),
      continued: true,
      broken: false,
    };
  }

  return { streak: 1, longest_streak: Math.max(1, longestStreak), continued: false, broken: true };
}

/** Longest run of consecutive days a habit was logged. */
export function computeHabitStreak(logs: HabitLog[], habitId: string, today: ISODate): number {
  const dates = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.date));
  if (dates.size === 0) return 0;

  // Allow "today not yet done" without zeroing the streak.
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/* ------------------------------------------------------------------ */
/* Bad-habit resistance                                                */
/* ------------------------------------------------------------------ */

export interface ResistanceStatus {
  days: number;
  shield_unlocked: boolean;
  legendary_unlocked: boolean;
  next_milestone: number | null;
}

/** Consecutive days the player has logged at least one bad-habit resistance. */
export function resistanceStreak(logs: HabitLog[], today: ISODate): number {
  const dates = new Set(logs.filter((l) => l.category === 'bad_habit').map((l) => l.date));
  if (dates.size === 0) return 0;

  let cursor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function resistanceStatus(logs: HabitLog[], today: ISODate): ResistanceStatus {
  const days = resistanceStreak(logs, today);
  const milestones = [RESIST_SHIELD_DAYS, RESIST_LEGENDARY_DAYS, 90, 365];
  const next = milestones.find((m) => m > days) ?? null;

  return {
    days,
    shield_unlocked: days >= RESIST_SHIELD_DAYS,
    legendary_unlocked: days >= RESIST_LEGENDARY_DAYS,
    next_milestone: next,
  };
}

/* ------------------------------------------------------------------ */
/* Perfect weeks and months                                            */
/* ------------------------------------------------------------------ */

/** A week is perfect when every scheduled habit was completed every day. */
export function isPerfectWeek(habits: Habit[], logs: HabitLog[], anyDateInWeek: ISODate): boolean {
  const monday = startOfIsoWeek(anyDateInWeek);
  const active = habits.filter((h) => h.is_active);
  if (active.length === 0) return false;

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(monday, i);
    for (const habit of active) {
      if (!isScheduledOn(habit, date)) continue;
      if (habit.frequency_type === 'x_per_week') continue;
      if (!wasCompletedOn(logs, habit.id, date)) return false;
    }
  }

  // Flexible habits are judged on their weekly target instead.
  for (const habit of active) {
    if (habit.frequency_type !== 'x_per_week') continue;
    if (!hasMetWeeklyTarget(habit, logs, monday)) return false;
  }

  return true;
}

export function countPerfectWeeks(habits: Habit[], logs: HabitLog[], today: ISODate): number {
  const weeks = new Set(logs.map((l) => startOfIsoWeek(l.date)));
  let count = 0;
  weeks.forEach((monday) => {
    // Only judge weeks that have fully elapsed.
    if (dayDiff(monday, today) >= 7 && isPerfectWeek(habits, logs, monday)) count += 1;
  });
  return count;
}

/** A month is perfect when every one of its ISO weeks is perfect. */
export function countPerfectMonths(habits: Habit[], logs: HabitLog[], today: ISODate): number {
  const months = new Set(logs.map((l) => monthKey(l.date)));
  let count = 0;

  months.forEach((month) => {
    const first = `${month}-01`;
    const daysInMonth = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      0,
    ).getDate();
    const last = `${month}-${String(daysInMonth).padStart(2, '0')}`;
    if (dayDiff(last, today) < 0) return; // month not finished

    for (let i = 0; i < daysInMonth; i += 1) {
      const date = addDays(first, i);
      for (const habit of habits.filter((h) => h.is_active)) {
        if (!isScheduledOn(habit, date)) continue;
        if (habit.frequency_type === 'x_per_week') continue;
        if (!wasCompletedOn(logs, habit.id, date)) return;
      }
    }
    count += 1;
  });

  return count;
}

/** Distinct days on which the player logged anything. */
export function daysActive(logs: HabitLog[]): number {
  return new Set(logs.map((l) => l.date)).size;
}

/** Completion rate for a habit over the last `window` days. */
export function completionRate(
  habit: Habit,
  logs: HabitLog[],
  today: ISODate,
  window = 30,
): number {
  let scheduled = 0;
  let done = 0;

  for (let i = 0; i < window; i += 1) {
    const date = addDays(today, -i);
    if (dayDiff(habit.created_at.slice(0, 10), date) < 0) continue;
    if (!isScheduledOn(habit, date)) continue;
    scheduled += 1;
    if (wasCompletedOn(logs, habit.id, date)) done += 1;
  }

  return scheduled === 0 ? 0 : done / scheduled;
}

/** Per-weekday completion counts — powers the habit-detail chart. */
export function completionsByWeekday(logs: HabitLog[], habitId: string): number[] {
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  logs
    .filter((l) => l.habit_id === habitId)
    .forEach((l) => {
      buckets[dayOfWeek(l.date)] += 1;
    });
  return buckets;
}
