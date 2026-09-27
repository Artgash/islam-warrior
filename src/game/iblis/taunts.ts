import type { IblisTaunt, ISOTimestamp, TauntLog } from '@/types';
import {
  TAUNT_MIN_GAP_DAYS,
  TAUNT_WINDOW_END_HOUR,
  TAUNT_WINDOW_START_HOUR,
} from '@/game/constants';
import type { Rng } from '@/game/battle/damage';
import { defaultRng } from '@/game/battle/damage';

/**
 * Iblis speaks as a tempter: patient, personal, never a caricature.
 * One taunt per week at most, never less than five days apart.
 */
export const TAUNTS: IblisTaunt[] = [
  { id: 1, text: "You think your little streak impresses me? I've broken men far stronger." },
  { id: 2, text: 'I was there when your father was weak. You are no different.' },
  { id: 3, text: 'Give up. Your habits mean nothing. You know it.' },
  { id: 4, text: 'You missed Fajr yesterday. Already losing.' },
  { id: 5, text: 'Look at your leaderboard. Everyone is ahead.' },
  { id: 6, text: "One day you'll slip. And I will be waiting." },
  { id: 7, text: 'Your Quran recitation is hollow. I hear no heart.' },
  { id: 8, text: 'I see you skip workouts. I see everything.' },
  { id: 9, text: 'Why try? The road is too long for you.' },
  { id: 10, text: "You'll be back to your old self in a week. I promise." },
  { id: 11, text: 'Your friends gave up too. So will you.' },
  { id: 12, text: "You're only doing this for show. I know your heart." },
  { id: 13, text: "That streak? It's fear, not discipline." },
  { id: 14, text: 'You pray fast. I count the seconds.' },
  { id: 15, text: 'You think Allah hears you? Prove it.' },
  { id: 16, text: 'The road to my throne is paved with men like you.' },
  { id: 17, text: "Every zone you enter, I've already poisoned." },
  { id: 18, text: "You're not a warrior. You're a boy with a sword." },
  { id: 19, text: "I don't even need to fight you. Time will." },
  { id: 20, text: 'You started this for likes. Not for Him.' },
  { id: 21, text: 'Look how tired you are. Rest. Just one day.' },
  { id: 22, text: 'Your habits are chains I made to keep you busy.' },
  { id: 23, text: "You'll never reach Zone 66. Nobody has." },
  { id: 24, text: 'I have whispered to kings. You are nothing.' },
  { id: 25, text: 'You think I fear your little app? I built your excuses.' },
  { id: 26, text: 'One missed day becomes two. I know the pattern.' },
  { id: 27, text: "Your family doesn't see your effort. I do. And I laugh." },
  { id: 28, text: 'You measure your faith in pixels and streaks.' },
  { id: 29, text: 'Come back to me. I kept your old habits warm.' },
  { id: 30, text: 'You were happier before you started. Admit it.' },
  { id: 31, text: "I don't need to defeat you. I just need to wait." },
  { id: 32, text: 'Your dua yesterday? I made sure you doubted it.' },
  { id: 33, text: 'The Prophet ﷺ had companions. You have an app.' },
  { id: 34, text: 'You think this is jihad? This is a game.' },
  { id: 35, text: "I've watched you fail a thousand times in my mind." },
  { id: 36, text: 'Your shield is cardboard. Your sword is rust.' },
  { id: 37, text: "When you fall — and you will — I'll be right here." },
  { id: 38, text: 'You call on Allah. He has not answered yet.' },
  { id: 39, text: 'Your ancestors fought with steel. You fight with taps.' },
  { id: 40, text: 'Every habit you complete, I plant a doubt.' },
  { id: 41, text: "You're not becoming stronger. You're becoming tired." },
  { id: 42, text: 'The road does not end. That is the trick.' },
  { id: 43, text: "You're only 1% of the way. Look up. See the mountain." },
  { id: 44, text: 'You celebrate small wins. I celebrate your pride.' },
  { id: 45, text: 'The strongest men I broke on Zone 5.' },
  { id: 46, text: 'You cannot defeat me. You can only delay.' },
  { id: 47, text: "I know the exact day you'll quit. I've circled it." },
  { id: 48, text: 'Your streak is your god now. Not Him.' },
  { id: 49, text: 'You will not finish. You were never going to.' },
  { id: 50, text: "You talk to me in the app. You're already mine." },
  { id: 51, text: 'You fear me more than you love Him. I can tell.' },
  { id: 52, text: 'Every level up is a step toward your fall.' },
  { id: 53, text: "I don't need soldiers. I need your attention." },
  { id: 54, text: 'You will reach my throne a hollow man.' },
  { id: 55, text: 'Your habits are for you. Not for Him. I know.' },
  { id: 56, text: 'I was there when you first promised. I remember.' },
  { id: 57, text: 'Your parents pray you return to who you were.' },
  { id: 58, text: 'You are only doing this to prove me wrong. And you will fail.' },
  { id: 59, text: 'Look behind you. No one is following you here.' },
  { id: 60, text: 'At the Throne, you will kneel. Everyone kneels.' },
];

const TAUNT_BY_ID = new Map<number, IblisTaunt>(TAUNTS.map((t) => [t.id, t]));

export function getTaunt(id: number): IblisTaunt | undefined {
  return TAUNT_BY_ID.get(id);
}

/* ------------------------------------------------------------------ */
/* Firing rules                                                        */
/* ------------------------------------------------------------------ */

function hoursBetween(a: ISOTimestamp, b: Date): number {
  return (b.getTime() - new Date(a).getTime()) / 3_600_000;
}

/**
 * May a taunt fire right now?
 * Rules: inside the local 08:00-23:00 window, and at least five days
 * since the last one.
 */
export function canFireTaunt(history: TauntLog[], now: Date = new Date()): boolean {
  const hour = now.getHours();
  if (hour < TAUNT_WINDOW_START_HOUR || hour >= TAUNT_WINDOW_END_HOUR) return false;

  const last = mostRecentTaunt(history);
  if (!last) return true;

  return hoursBetween(last.fired_at, now) >= TAUNT_MIN_GAP_DAYS * 24;
}

export function mostRecentTaunt(history: TauntLog[]): TauntLog | undefined {
  if (history.length === 0) return undefined;
  return [...history].sort(
    (a, b) => new Date(b.fired_at).getTime() - new Date(a.fired_at).getTime(),
  )[0];
}

/**
 * Choose the next taunt, preferring ones this player has not heard.
 * Once all 60 are exhausted the pool resets — Iblis repeats himself
 * eventually, as he always has.
 */
export function selectTaunt(history: TauntLog[], rng: Rng = defaultRng): IblisTaunt {
  const heard = new Set(history.map((h) => h.taunt_id));
  const unheard = TAUNTS.filter((t) => !heard.has(t.id));
  const pool = unheard.length > 0 ? unheard : TAUNTS;
  return pool[Math.floor(rng() * pool.length)];
}

/** Days until the next taunt may fire. */
export function daysUntilNextTaunt(history: TauntLog[], now: Date = new Date()): number {
  const last = mostRecentTaunt(history);
  if (!last) return 0;
  const elapsed = hoursBetween(last.fired_at, now) / 24;
  return Math.max(0, Math.ceil(TAUNT_MIN_GAP_DAYS - elapsed));
}

/** An unanswered taunt blocks new ones and keeps the overlay pending. */
export function pendingTaunt(history: TauntLog[]): TauntLog | undefined {
  return history.find((h) => h.replied_at === null);
}

export const TOTAL_TAUNTS = TAUNTS.length;
