import type { HabitCategory, HabitIntensity } from '@/types';
import { BAD_HABIT_REWARD_MULTIPLIER, INTENSITY_TABLE, type IntensityDef } from '@/game/constants';

export function intensityDef(intensity: HabitIntensity): IntensityDef {
  return INTENSITY_TABLE[intensity];
}

export function damageMultiplier(intensity: HabitIntensity): number {
  return INTENSITY_TABLE[intensity].damage_multiplier;
}

/**
 * Base XP for completing a habit. Resisting a bad habit pays triple:
 * restraint is harder than action, and the game should say so.
 */
export function baseXpFor(intensity: HabitIntensity, category: HabitCategory): number {
  const base = INTENSITY_TABLE[intensity].xp;
  return category === 'bad_habit' ? base * BAD_HABIT_REWARD_MULTIPLIER : base;
}

export function baseCoinsFor(intensity: HabitIntensity, category: HabitCategory): number {
  const base = INTENSITY_TABLE[intensity].coins;
  return category === 'bad_habit' ? base * BAD_HABIT_REWARD_MULTIPLIER : base;
}

export const INTENSITY_LEVELS: HabitIntensity[] = [1, 2, 3, 4, 5];

export function intensityLabel(intensity: HabitIntensity): string {
  return INTENSITY_TABLE[intensity].label;
}

export function intensityHint(intensity: HabitIntensity): string {
  return INTENSITY_TABLE[intensity].hint;
}

/** Tailwind text colour per intensity, for stars and badges. */
export function intensityColor(intensity: HabitIntensity): string {
  switch (intensity) {
    case 1:
      return 'text-muted';
    case 2:
      return 'text-emerald';
    case 3:
      return 'text-[#3B82F6]';
    case 4:
      return 'text-gold';
    case 5:
      return 'text-legendary';
  }
}
