/**
 * Generates supabase/migrations/0004_seed.sql from the TypeScript game data.
 *
 * The TS files under /src/game are the single source of truth for zones,
 * monsters, gear, ranks, taunts, achievements and seasons. Running this
 * script after changing any of them keeps the database in step, and means
 * the 1,056-row bestiary is never hand-maintained.
 *
 *   npm run seed
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ZONES } from '../src/game/zones/zones';
import { getBestiary } from '../src/game/zones/monsters';
import { ALL_GEAR, CONSUMABLES } from '../src/game/shop/gearStats';
import { RANKS } from '../src/game/ranks/rankLogic';
import { TAUNTS } from '../src/game/iblis/taunts';
import { REPLIES } from '../src/game/iblis/replies';
import { ACHIEVEMENTS } from '../src/game/achievements/checkers';
import { SEASONS } from '../src/game/seasons/seasonLogic';
import { IBLIS_HP_EXACT } from '../src/game/constants';

/* ------------------------------------------------------------------ */
/* SQL literal helpers                                                 */
/* ------------------------------------------------------------------ */

function q(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  return `'${value.replace(/'/g, "''")}'`;
}

function num(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : String(value);
}

/**
 * Emits an exact integer where one is supplied, falling back to the float.
 * Only Iblis needs this: his HP is larger than a JS number can hold exactly.
 */
function exactNum(value: number, exact?: string): string {
  return exact ?? num(value);
}

function bool(value: boolean): string {
  return value ? 'true' : 'false';
}

function textArray(values: string[]): string {
  if (values.length === 0) return "'{}'";
  return `array[${values.map(q).join(', ')}]`;
}

function jsonb(value: unknown): string {
  return `${q(JSON.stringify(value))}::jsonb`;
}

/** Emit an INSERT ... ON CONFLICT DO UPDATE so reseeding is idempotent. */
function upsert(
  table: string,
  columns: string[],
  rows: string[][],
  conflictKey: string,
): string {
  if (rows.length === 0) return '';

  const updates = columns
    .filter((c) => c !== conflictKey)
    .map((c) => `  "${c}" = excluded."${c}"`)
    .join(',\n');

  const values = rows.map((row) => `  (${row.join(', ')})`).join(',\n');

  return [
    `insert into public.${table} (${columns.map((c) => `"${c}"`).join(', ')}) values`,
    values,
    `on conflict ("${conflictKey}") do update set`,
    updates,
    ';',
    '',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

const sections: string[] = [];

sections.push(
  [
    '-- =====================================================================',
    '-- ISLAM WARRIOR — seed data',
    '-- 0004: GENERATED FILE — do not edit by hand.',
    '--',
    '-- Regenerate with:  npm run seed',
    '-- Source of truth:  src/game/**',
    `-- Generated:        ${new Date().toISOString()}`,
    '-- =====================================================================',
    '',
    'begin;',
    '',
  ].join('\n'),
);

/* Zones ------------------------------------------------------------- */

sections.push('-- 66 zones --------------------------------------------------------\n');
sections.push(
  upsert(
    'zones',
    ['id', 'name', 'theme', 'boss_name', 'base_hp', 'lore'],
    ZONES.map((z) => [
      num(z.id),
      q(z.name),
      q(z.theme),
      q(z.boss_name),
      // Zone 66's authored base_hp is Iblis himself, beyond float precision.
      exactNum(z.base_hp, z.id === 66 ? IBLIS_HP_EXACT : undefined),
      q(z.lore),
    ]),
    'id',
  ),
);

/* Monsters ---------------------------------------------------------- */

const bestiary = getBestiary();

sections.push(
  `-- ${bestiary.length} monsters (66 zones x 16, index 15 is the zone boss) -------\n`,
);

// Chunked so no single statement grows unreasonably large.
const CHUNK = 120;
for (let i = 0; i < bestiary.length; i += CHUNK) {
  sections.push(
    upsert(
      'monsters',
      [
        'id', 'zone_id', 'index', 'name', 'description', 'image_prompt',
        'max_hp', 'attack', 'defense', 'xp_reward', 'coin_reward', 'is_boss',
      ],
      bestiary.slice(i, i + CHUNK).map((m) => [
        q(m.id),
        num(m.zone_id),
        num(m.index),
        q(m.name),
        q(m.description),
        q(m.image_prompt),
        exactNum(m.max_hp, m.max_hp_exact),
        num(m.attack),
        num(m.defense),
        num(m.xp_reward),
        num(m.coin_reward),
        bool(m.is_boss),
      ]),
      'id',
    ),
  );
}

/* Gear -------------------------------------------------------------- */

sections.push('-- Gear catalogue --------------------------------------------------\n');
sections.push(
  upsert(
    'gear_items',
    [
      'id', 'name', 'arabic', 'slot', 'tier', 'rarity', 'price',
      'stats', 'description', 'required_rank', 'is_award_only', 'awarded_label',
    ],
    ALL_GEAR.map((g) => [
      q(g.id),
      q(g.name),
      q(g.arabic ?? null),
      `'${g.slot}'`,
      num(g.tier),
      `'${g.rarity}'`,
      num(g.price),
      jsonb(g.stats),
      q(g.description),
      num(g.required_rank),
      bool(g.is_award_only),
      q(g.awarded_label ?? null),
    ]),
    'id',
  ),
);

sections.push('-- Consumables ------------------------------------------------------\n');
sections.push(
  upsert(
    'consumable_items',
    ['id', 'name', 'price', 'effect', 'magnitude', 'duration_hours', 'description', 'required_rank'],
    CONSUMABLES.map((c) => [
      q(c.id),
      q(c.name),
      num(c.price),
      q(c.effect),
      String(c.magnitude),
      num(c.duration_hours),
      q(c.description),
      num(c.required_rank),
    ]),
    'id',
  ),
);

/* Ranks ------------------------------------------------------------- */

sections.push('-- Ten ranks --------------------------------------------------------\n');
sections.push(
  upsert(
    'ranks',
    ['tier', 'name', 'arabic', 'english', 'color', 'accent', 'xp_required', 'multiplier', 'max_habits', 'unlocks'],
    RANKS.map((r) => [
      num(r.tier),
      q(r.name),
      q(r.arabic),
      q(r.english),
      q(r.color),
      q(r.accent ?? null),
      num(r.xp_required),
      String(r.multiplier),
      num(r.max_habits),
      textArray(r.unlocks),
    ]),
    'tier',
  ),
);

/* Iblis ------------------------------------------------------------- */

sections.push('-- 60 taunts --------------------------------------------------------\n');
sections.push(
  upsert('iblis_taunts', ['id', 'text'], TAUNTS.map((t) => [num(t.id), q(t.text)]), 'id'),
);

sections.push('-- 10 replies -------------------------------------------------------\n');
sections.push(
  upsert(
    'iblis_replies',
    ['id', 'text', 'morale_percent'],
    REPLIES.map((r) => [num(r.id), q(r.text), String(r.morale_percent)]),
    'id',
  ),
);

/* Achievements ------------------------------------------------------ */

sections.push('-- Achievements -----------------------------------------------------\n');
sections.push(
  upsert(
    'achievements',
    ['id', 'name', 'description', 'category', 'rarity', 'secret', 'target', 'reward_coins', 'season_id'],
    ACHIEVEMENTS.map((a) => [
      q(a.id),
      q(a.name),
      q(a.description),
      q(a.category),
      `'${a.rarity}'`,
      bool(a.secret),
      num(a.target),
      num(a.reward_coins),
      q(a.season_id ?? null),
    ]),
    'id',
  ),
);

/* Seasons ----------------------------------------------------------- */

sections.push('-- Seasons ----------------------------------------------------------\n');
sections.push(
  upsert(
    'seasons',
    ['id', 'number', 'name', 'theme', 'start_date', 'end_date'],
    SEASONS.map((s) => [
      q(s.id),
      num(s.number),
      q(s.name),
      q(s.theme),
      q(s.start_date),
      q(s.end_date),
    ]),
    'id',
  ),
);

sections.push('commit;\n');

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../supabase/migrations/0004_seed.sql');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, sections.join('\n'), 'utf8');

const summary = [
  `zones:        ${ZONES.length}`,
  `monsters:     ${bestiary.length}`,
  `gear items:   ${ALL_GEAR.length}`,
  `consumables:  ${CONSUMABLES.length}`,
  `ranks:        ${RANKS.length}`,
  `taunts:       ${TAUNTS.length}`,
  `replies:      ${REPLIES.length}`,
  `achievements: ${ACHIEVEMENTS.length}`,
  `seasons:      ${SEASONS.length}`,
];

process.stdout.write(`Wrote ${outPath}\n${summary.map((s) => `  ${s}`).join('\n')}\n`);
