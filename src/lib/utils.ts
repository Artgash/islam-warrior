import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** RFC4122-ish id that works without `crypto.randomUUID` on older platforms. */
export function uid(prefix = ''): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}${crypto.randomUUID()}`;
    }
  } catch {
    /* fall through */
  }
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
