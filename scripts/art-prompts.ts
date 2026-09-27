/**
 * Prints every art prompt the game needs, ready to paste into an image
 * generator. Writes a JSON manifest alongside so a batch job can be scripted.
 *
 *   npm run art:prompts
 *
 * The manifest tells you exactly where each finished file belongs; once they
 * are in place, flip PUBLIC_ART_ENABLED in src/lib/art.ts and the app picks
 * them up with no other change.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ZONES } from '../src/game/zones/zones';
import { RANKS } from '../src/game/ranks/rankLogic';
import { buildBossJobs, buildWarriorJobs, ART_DIRECTION } from '../src/lib/art';

const warriorJobs = buildWarriorJobs(RANKS.map((r) => ({ tier: r.tier, name: r.name })));
const bossJobs = buildBossJobs(
  ZONES.map((z) => ({ id: z.id, name: z.name, boss_name: z.boss_name, theme: z.theme })),
);

const all = [...warriorJobs, ...bossJobs];

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../art-manifest.json');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    {
      generated: new Date().toISOString(),
      art_direction: ART_DIRECTION,
      count: all.length,
      jobs: all,
    },
    null,
    2,
  ),
  'utf8',
);

process.stdout.write(
  [
    `Wrote ${outPath}`,
    ``,
    `  warrior portraits : ${warriorJobs.length}`,
    `  zone bosses       : ${bossJobs.length}`,
    `  total             : ${all.length}`,
    ``,
    `Shared art direction:`,
    `  ${ART_DIRECTION}`,
    ``,
    `First three prompts:`,
    ...all.slice(0, 3).map((job) => `\n  [${job.id}] -> ${job.path}\n  ${job.prompt}`),
    ``,
  ].join('\n'),
);
