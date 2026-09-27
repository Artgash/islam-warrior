/**
 * Date helpers built on date-fns, plus the weekly-reset clock.
 * The reset is sacred: Monday 00:00 UTC, everywhere, no exceptions.
 */

import {
  addDays,
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { ISODate, ISOTimestamp } from '@/types';

export function today(): ISODate {
  return format(new Date(), 'yyyy-MM-dd');
}

export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

export function fromISODate(date: ISODate): Date {
  return parseISO(date);
}

export function nowTimestamp(): ISOTimestamp {
  return new Date().toISOString();
}

export function isToday(date: ISODate): boolean {
  return isSameDay(parseISO(date), new Date());
}

export function isYesterday(date: ISODate): boolean {
  return isSameDay(parseISO(date), addDays(new Date(), -1));
}

export function daysAgo(date: ISODate): number {
  return differenceInCalendarDays(new Date(), parseISO(date));
}

export function relative(timestamp: ISOTimestamp): string {
  try {
    return `${formatDistanceToNowStrict(parseISO(timestamp))} ago`;
  } catch {
    return 'just now';
  }
}

export function formatDay(date: ISODate): string {
  return format(parseISO(date), 'EEE d MMM');
}

export function formatLongDay(date: ISODate): string {
  return format(parseISO(date), 'EEEE d MMMM yyyy');
}

export function formatTime(timestamp: ISOTimestamp): string {
  return format(parseISO(timestamp), 'HH:mm');
}

export function startOfToday(): Date {
  return startOfDay(new Date());
}

/* ------------------------------------------------------------------ */
/* Weekly reset: Monday 00:00 UTC                                      */
/* ------------------------------------------------------------------ */

/** The Date of the next Monday 00:00 UTC strictly after `from`. */
export function nextWeeklyReset(from: Date = new Date()): Date {
  const next = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0, 0),
  );

  // getUTCDay: 0 = Sunday, 1 = Monday
  const day = next.getUTCDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
  next.setUTCDate(next.getUTCDate() + daysUntilMonday);

  return next;
}

/** Milliseconds until the weekly leaderboard wipes. */
export function msUntilWeeklyReset(from: Date = new Date()): number {
  return Math.max(0, nextWeeklyReset(from).getTime() - from.getTime());
}

/** The Monday 00:00 UTC that opened the current week. */
export function currentWeekStart(from: Date = new Date()): Date {
  const start = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0, 0),
  );
  const day = start.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

/** ISO week key used to bucket weekly XP, e.g. "2026-W39". */
export function currentWeekKey(from: Date = new Date()): string {
  const start = currentWeekStart(from);
  const target = new Date(start.valueOf());
  target.setUTCDate(target.getUTCDate() + 3); // the week's Thursday

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);

  const week =
    1 + Math.round((target.valueOf() - firstThursday.valueOf()) / (7 * 86_400_000));

  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function currentMonthKey(from: Date = new Date()): string {
  return format(from, 'yyyy-MM');
}

export function monthLabel(key: string): string {
  try {
    return format(parseISO(`${key}-01`), 'MMMM yyyy');
  } catch {
    return key;
  }
}

/** Was `timestamp` recorded inside the current reset week? */
export function isThisWeek(timestamp: ISOTimestamp): boolean {
  const start = currentWeekStart();
  return new Date(timestamp).getTime() >= start.getTime();
}

export { addDays, differenceInCalendarDays, format, parseISO };
