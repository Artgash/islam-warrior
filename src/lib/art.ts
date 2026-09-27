/**
 * The painted-art layer.
 *
 * The game draws every character procedurally and looks complete without a
 * single image file. This module is the seam where real painted art takes
 * over, one subject at a time, with no component changes and no risk: if a
 * URL is absent or the file fails to load, the vector art underneath simply
 * stays visible.
 *
 * TO ADD REAL ART
 * ---------------
 * 1. Generate or commission the images. Every monster already carries an
 *    `image_prompt` written for exactly this purpose - see
 *    `src/game/zones/monsters.ts` and the seeded `monsters.image_prompt`
 *    column. `npm run art:prompts` prints them.
 * 2. Drop the files in `public/art/` (or upload to the Supabase
 *    `monster-art` / `avatars` buckets).
 * 3. Register them below. Nothing else in the app changes.
 *
 * Naming convention expected by `PUBLIC_ART`:
 *    public/art/warrior/tier-1.webp  ...  tier-10.webp
 *    public/art/boss/zone-1.webp     ...  zone-66.webp
 *    public/art/monster/z3_m7.webp   (optional, per-monster)
 */

import type { Monster } from '@/types';
import { assetUrl, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Turn on once real files exist. Left off so the app never requests images
 * that are not there and never logs a wall of 404s.
 */
export const PUBLIC_ART_ENABLED = false;

/** Explicit overrides always win, whether or not the flag above is on. */
const WARRIOR_OVERRIDES: Partial<Record<number, string>> = {};
const BOSS_OVERRIDES: Partial<Record<number, string>> = {};
const MONSTER_OVERRIDES: Partial<Record<string, string>> = {};

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

/** Painted art for the warrior at a given rank tier, or null. */
export function warriorArtUrl(tier: number): string | null {
  const override = WARRIOR_OVERRIDES[tier];
  if (override) return override;

  if (!PUBLIC_ART_ENABLED) return null;

  if (isSupabaseConfigured) {
    return assetUrl('avatars', `warrior/tier-${tier}.webp`);
  }

  return `/art/warrior/tier-${tier}.webp`;
}

/**
 * Painted art for a monster. Zone bosses are looked up by zone, since one
 * illustration covers the boss of that zone; regular monsters fall back to
 * an exact id match and otherwise stay vector.
 */
export function monsterArtUrl(monster: Monster): string | null {
  const exact = MONSTER_OVERRIDES[monster.id];
  if (exact) return exact;

  if (monster.is_boss) {
    const bossOverride = BOSS_OVERRIDES[monster.zone_id];
    if (bossOverride) return bossOverride;

    if (!PUBLIC_ART_ENABLED) return null;

    return isSupabaseConfigured
      ? assetUrl('monsterArt', `boss/zone-${monster.zone_id}.webp`)
      : `/art/boss/zone-${monster.zone_id}.webp`;
  }

  if (!PUBLIC_ART_ENABLED) return null;

  return isSupabaseConfigured
    ? assetUrl('monsterArt', `monster/${monster.id}.webp`)
    : `/art/monster/${monster.id}.webp`;
}

/* ------------------------------------------------------------------ */
/* Prompt generation                                                   */
/* ------------------------------------------------------------------ */

/**
 * The art direction every generated image should share. Kept here so the
 * whole cast looks like it came from one artist rather than ten.
 */
export const ART_DIRECTION = [
  'semi-realistic painted dark fantasy game art',
  'Diablo and Blasphemous and Darkest Dungeon reference',
  'dramatic single key light from upper left, strong rim light from behind',
  'deep shadows, muted desaturated palette with one saturated accent',
  'full body, centred, facing viewer, plain near-black background',
  'no text, no watermark, no anime styling, no cartoon proportions',
  'solemn and grim, never comedic',
].join(', ');

/** The prompt for the warrior at a given rank. */
export function warriorPrompt(rankName: string, armour: string): string {
  return [
    `full body character art of a hooded Muslim warrior, rank "${rankName}"`,
    armour,
    'carrying a curved sword and a tall shield',
    'face in shadow beneath the hood, eyes faintly glowing',
    ART_DIRECTION,
  ].join(', ');
}

/** Armour description per rank tier, for prompt generation. */
export const ARMOUR_BY_TIER: Record<number, string> = {
  1: 'plain travel-worn wool robes, no armour, dusty and road-stained',
  2: 'simple leather jerkin over robes, a single worn strap',
  3: 'hardened leather armour with iron studs, a short cloak',
  4: 'chain mail shirt over leather, plain and functional',
  5: 'full chain hauberk with steel bracers and a dark cloak',
  6: 'steel plate over mail, engraved pauldrons, a long cloak',
  7: 'polished commander plate armour, gold-trimmed pauldrons, flowing cloak',
  8: 'blackened obsidian plate with gold filigree, a heavy ceremonial cloak',
  9: 'white and gold robes over fine plate, radiant and understated',
  10: 'pure gold radiant armour, a crown-like helm, an aura of light',
};

export function bossPrompt(zoneName: string, bossName: string, theme: string): string {
  return [
    `full body creature art of "${bossName}", the boss of ${zoneName}`,
    `embodying ${theme.toLowerCase()}`,
    'towering, imposing, clearly more dangerous than its servants',
    'smoke and ember particles around its base',
    ART_DIRECTION,
  ].join(', ');
}

/** Everything needed to commission the full hero set. */
export interface ArtJob {
  id: string;
  kind: 'warrior' | 'boss';
  prompt: string;
  /** Where the finished file belongs. */
  path: string;
}

export function buildWarriorJobs(
  ranks: { tier: number; name: string }[],
): ArtJob[] {
  return ranks.map((rank) => ({
    id: `warrior-${rank.tier}`,
    kind: 'warrior' as const,
    prompt: warriorPrompt(rank.name, ARMOUR_BY_TIER[rank.tier] ?? ''),
    path: `art/warrior/tier-${rank.tier}.webp`,
  }));
}

export function buildBossJobs(
  zones: { id: number; name: string; boss_name: string; theme: string }[],
): ArtJob[] {
  return zones.map((zone) => ({
    id: `boss-${zone.id}`,
    kind: 'boss' as const,
    prompt: bossPrompt(zone.name, zone.boss_name, zone.theme),
    path: `art/boss/zone-${zone.id}.webp`,
  }));
}
