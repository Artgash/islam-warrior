# ISLAM WARRIOR

A dark Islamic-fantasy RPG whose engine is your real habits.

You play a warrior on a 66-zone road to the Throne of Iblis. Every habit you
actually complete — Fajr, a workout, a day without doomscrolling — fires as a
move against the monster in front of you. Over months the zones open, the rank
ladder climbs, and the final enemy gets closer.

It is not a habit tracker with a game skin. It is a game whose engine is
discipline.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

That is the whole setup. The app runs **offline-first**: with no backend
configured it creates a local account, stores everything in the browser, and
the full single-player loop works — onboarding, battle, zones, shop, ranks,
Iblis, achievements.

To add cloud sync, real accounts, guild chat and true leaderboards, see
[Connecting Supabase](#connecting-supabase).

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript only, no emit |
| `npm test` | Run the game-logic test suite (65 tests) |
| `npm run seed` | Regenerate `supabase/migrations/0004_seed.sql` from `src/game/**` |

---

## How the game works

**The daily loop.** Open the app, see the current monster, tap a habit you have
genuinely completed, confirm, deal damage. The monster hits back. Kill it, take
the loot, step one place further along the road.

**Damage** is
`(base_attack + gear + strength_bonus) × intensity × combo × crit × morale × rank`,
reduced by the monster's defense and floored at 1. Every term in that formula
is implemented in [`src/game/battle/`](src/game/battle/) and unit-tested.

**Intensity** runs 1–5, from a two-minute habit to a real sacrifice. Resisting a
bad habit pays **triple** XP and coins — restraint is the harder jihad, and the
economy says so.

**Combo** grows 10% per habit completed that day, capped at 3×. Doing five
things on one day is worth more than five things spread thin.

**The road** is 66 zones × 16 monsters. Index 15 of each zone is its boss, with
3× HP and guaranteed rare-or-better loot. Zone 66's boss is Iblis, with
999,999,999,999,999,999 HP.

**Ranks** are ten tiers (Muhajir → Khalifa), three divisions each. They grant
damage multipliers from 1.0× to 2.0× and unlock the shop, guilds, streak
freezes and the legendary tier. Absence decays rank XP — 5% after three days,
15% after a fortnight — but **never below the floor of your current division**,
and returning within three days pays a +15% comeback bonus that exceeds what the
break cost.

**Iblis** speaks at most once a week, never less than five days apart, never
between 11pm and 8am. He is written as a tempter, never a caricature. You can
answer him for +10% attack over 24 hours, or say nothing at no cost.

---

## Architecture

```
src/
  game/        PURE TypeScript. No DOM, no imports from React, no I/O.
               All 66 zones, the bestiary generator, damage maths, levelling,
               ranks, decay, streaks, loot, gear, taunts, seasons,
               achievements. This directory is the game.
  platform/    The ONLY code that touches window/localStorage/Audio.
  api/         Supabase calls and their local-mode fallbacks.
  state/       Zustand slices (user, character, habits, battle, shop, iblis,
               guild, achievements, ui) plus derived selectors.
  components/  UI, grouped by feature.
  pages/       One per route.
  types/       Shared type system, imported by everything.
```

### Why `src/game` is pure

Every number in the game is decided by a function that takes data and returns
data. No component computes damage. No store reimplements the level curve.
That buys three things:

1. **Testability.** The 65 tests in `src/game/__tests__` run in Node with no
   DOM and no mocks.
2. **One source of truth.** `npm run seed` generates all 1,056 monster rows for
   Postgres from the same TypeScript the client runs. The bestiary is never
   hand-maintained in two places.
3. **React Native portability.** Porting means writing a new UI layer and
   swapping `src/platform/storage.ts` for AsyncStorage. `src/game`, `src/types`
   and `src/api` move unchanged.

### Offline-first

`isSupabaseConfigured` is the single switch. Every API module has two paths
behind one signature: talk to Supabase, or fall back to the local adapter. The
UI says which mode it is in rather than pretending — the Leaderboards screen
labels the generated ladder as local, and the auth screen explains that local
accounts live only in that browser.

**Local mode is not a security boundary.** It exists so the single-player loop
works on first clone. Anything multiplayer needs Supabase.

---

## Connecting Supabase

### 1. Create the project

Create a project at [supabase.com](https://supabase.com), then:

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
**Project Settings → API**. The anon key is meant to be public — row-level
security is what protects the data.

### 2. Run the migrations

In order, via the SQL editor or the CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

| File | Contents |
| --- | --- |
| `0001_schema.sql` | 36 tables, enums, constraints, indexes |
| `0002_rls.sql` | Row-level security on every table |
| `0003_functions.sql` | Triggers, leaderboard views, cron jobs |
| `0004_seed.sql` | **Generated.** 66 zones, 1,056 monsters, 59 gear items, 9 consumables, 10 ranks, 60 taunts, 10 replies, 42 achievements, 3 seasons |

`0004_seed.sql` is produced by `npm run seed` — edit the TypeScript in
`src/game/**` and regenerate rather than editing the SQL.

### 3. Deploy the edge functions

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase functions deploy
```

| Function | Purpose | Auth |
| --- | --- | --- |
| `complete-habit` | The authoritative move: validates, rolls the crit, awards XP/coins/damage, handles the kill, loot and advancement | User JWT |
| `iblis-reply` | Records an answer and grants the morale buff | User JWT |
| `iblis-fire-taunt` | Fires a taunt for one player, or sweeps everyone | User JWT / service key |
| `rank-up-check` | Idempotent tier and division recompute | User JWT |
| `admin-award-monthly` | Grants a monthly relic, with an audit trail | Admin |
| `delete-account` | Erases owned rows, hands over guild leadership, deletes the account | User JWT |
| `weekly-reset` | Archives the week, rolls guild XP | Service key |
| `season-rollover` | Soft rank reset | Service key |
| `apply-rank-decay` | Daily decay sweep | Service key |
| `anti-cheat-scan` | Flags improbable activity | Service key |
| `guild-war-matchmake` | Pairs guilds by weekly XP | Service key |

The five maintenance functions are thin wrappers over SQL routines that
`pg_cron` already schedules inside the database (see the bottom of
`0003_functions.sql`). They exist so an external scheduler can trigger the same
logic — there is one implementation, not two.

**On `attack-monster` and `kill-monster`:** these are deliberately folded into
`complete-habit` rather than shipped as separate endpoints. A habit completion
*is* the attack; splitting it would create a second path that awards XP and
advances the road, which is exactly the shape of bug anti-cheat work exists to
prevent. One endpoint, one place to get authorisation right.

### 4. Storage buckets

Create four public buckets: `avatars`, `monster-art`, `gear-art`, `badge-art`.

They are optional. Avatars, rank badges and monster art are all currently drawn
as inline SVG — generated procedurally per monster from its id and zone — so the
app ships with no raster assets and every one of the 1,056 monsters looks
distinct. The buckets are wired up in `src/lib/supabase.ts` for when real
illustrations replace the generated ones, behind the same components.

### 5. Google OAuth (optional)

Enable Google in **Authentication → Providers**, add
`https://your-domain/auth/callback` as a redirect URL, and set
`VITE_ENABLE_GOOGLE_AUTH=true`.

---

## Deploying

See **[DEPLOY.md](DEPLOY.md)** for the full runbook — pushing to GitHub,
deploying to Vercel, and which environment variables are optional versus
dangerous.

The short version:

```bash
gh auth login
gh repo create islam-warrior --private --source=. --remote=origin --push

vercel login
vercel --prod
```

`vercel.json` is committed and already sets the build command, output
directory, the SPA rewrite that client-side routing requires, and security
headers. The app deploys and plays with **no environment variables at all**.

---

## Security notes

- **Row-level security is on for all 36 tables.** A player reads and writes
  only rows carrying their `user_id`. Static game data is world-readable to
  signed-in users; leaderboards are exposed through views that select only
  public-safe columns. **Individual habits are never visible to other players.**
- **One completion per habit per day** is enforced by a unique
  `(habit_id, date)` index, not by client code. A replayed request hits the
  constraint.
- **The +5/day stat cap** is enforced by a database trigger, so it holds even
  against a hand-crafted request.
- **Monthly relics cannot be self-granted** — the owner-write policy is dropped
  for `monthly_rewards` in favour of an admin-only policy.
- **The service-role key bypasses RLS.** It belongs only in edge function
  secrets, never in a `VITE_` variable.

## Design rules held to

- **No pay-to-win.** The season pass and legendary shop sell cosmetics. Nothing
  bought with money changes damage, XP, coins or drop rates.
- **No shame mechanics.** Falling in battle pauses until tomorrow and costs
  nothing. Decay is floored at your division. The comeback bonus is larger than
  the penalty for the break that earned it.
- **Every number displayed comes from real state.** There are no decorative
  counters.
- **Iblis stays a tempter.** He is never mocked, never mocking of the faith, and
  never speaks while you are asleep.

## Licence

Unlicensed / all rights reserved. Add a licence before publishing.
