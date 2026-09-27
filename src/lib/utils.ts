import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * A bare RFC4122 v4 UUID.
 *
 * USE THIS for anything that becomes a database row. Every `id` column in
 * the schema is `uuid`, and Postgres rejects anything else outright - a
 * prefixed id like `char_9f8e...` fails with "invalid input syntax for type
 * uuid", which silently breaks sync for that table.
 */
export function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the manual path */
  }

  // Manual v4, for older browsers and non-secure contexts where
  // crypto.randomUUID is unavailable.
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    /* fall through */
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** True for a well-formed UUID. Used to spot pre-UUID local rows. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * A prefixed, human-readable id for things that never leave the client -
 * combat log entries, transient UI keys. Never use it for a database row.
 */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}-${rand}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Shuffle a copy of an array. */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function groupBy<T, K extends string | number>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function sum(items: number[]): number {
  return items.reduce((a, b) => a + b, 0);
}
