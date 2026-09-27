/**
 * The season pass: 50 tiers, free and premium tracks, and the soft-reset
 * explanation so nobody is surprised when their rank drops.
 */

import { Check, Gift, Lock, Sparkles } from 'lucide-react';
import { useGameStore } from '@/state';
import { selectWeeklyXp } from '@/state/selectors';
import { PageShell } from '@/components/common/Layout';
import { Badge, EmptyState, Progress } from '@/components/ui/misc';
import { StarDivider } from '@/components/common/StarDivider';
import {
  SEASON_PASS,
  SEASON_TIERS,
  applySoftReset,
  currentSeason,
  daysRemaining,
  passTierProgress,
  seasonProgress,
  tierForSeasonXp,
} from '@/game/seasons/seasonLogic';
import { getRankDef } from '@/game/ranks/rankLogic';
import { today as todayISO } from '@/lib/date';
import { smartNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function SeasonPage() {
  const character = useGameStore((s) => s.character);
  const weeklyXp = useGameStore(selectWeeklyXp);

  const date = todayISO();
  const season = currentSeason(date);

  if (!character) return null;

  if (!season) {
    return (
      <PageShell title="Season">
        <EmptyState
          icon={<Sparkles className="size-9" />}
          title="Between seasons"
          description="The next season begins soon. Zone progress never resets — only standing does."
        />
      </PageShell>
    );
  }

  // Season XP is the XP earned since the season opened. Approximated from
  // lifetime XP minus a snapshot would require history we do not keep
  // locally, so the current week's XP drives the pass in local mode.
  const seasonXp = weeklyXp;
  const tier = tierForSeasonXp(seasonXp);
  const tierProgress = passTierProgress(seasonXp);
  const calendarProgress = seasonProgress(season, date);
  const remaining = daysRemaining(season, date);
  const reset = applySoftReset(character.rank_xp);

  return (
    <PageShell title={season.name} subtitle={season.theme}>
      {/* Season status */}
      <div className="panel framed p-4">
        <div className="flex items-baseline justify-between">
          <Badge variant="gold">Season {season.number}</Badge>
          <span className="text-xs text-muted">{remaining} days remaining</span>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted">Season calendar</span>
            <span className="tabular text-muted">{formatPercent(calendarProgress)}</span>
          </div>
          <Progress value={calendarProgress} height="h-1.5" barClassName="bg-muted" />
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-bone">
              Pass tier {tier} / {SEASON_TIERS}
            </span>
            <span className="tabular text-gold">{smartNumber(seasonXp)} season XP</span>
          </div>
          <Progress value={tierProgress} barClassName="bg-gradient-to-r from-gold to-legendary" />
        </div>
      </div>

      {/* Soft reset warning */}
      <div className="panel mt-4 p-4">
        <p className="heading-rule mb-2">At season end</p>
        <p className="text-sm leading-relaxed text-muted">
          Your rank soft-resets by {reset.tiers_dropped} tier
          {reset.tiers_dropped === 1 ? '' : 's'} — from{' '}
          <span className="text-bone">{getRankDef(reset.tier_before).name}</span> down to{' '}
          <span className="text-bone">{getRankDef(reset.tier_after).name}</span>. Your zone,
          level, gear, coins and habits are untouched. Only standing resets, so the ladder stays
          worth climbing.
        </p>
      </div>

      {/* Pass */}
      <StarDivider label="The pass" className="mt-6" />

      <div className="mb-3 grid grid-cols-2 gap-2 text-center text-[10px] uppercase tracking-widest">
        <span className="rounded-lg border border-edge bg-night/50 py-1.5 text-muted">Free</span>
        <span className="rounded-lg border border-legendary/40 bg-legendary/10 py-1.5 text-legendary">
          Premium — cosmetics only
        </span>
      </div>

      <ol className="space-y-1.5">
        {SEASON_PASS.map((row) => {
          const reached = tier >= row.tier;
          const isMilestone = row.tier % 10 === 0 || row.tier === SEASON_TIERS;

          return (
            <li
              key={row.tier}
              className={cn(
                'panel flex items-center gap-2 p-2',
                reached && 'border-gold/40',
                isMilestone && 'border-legendary/40',
              )}
            >
              <span
                className={cn(
                  'tabular flex size-8 shrink-0 items-center justify-center rounded-lg border font-display text-xs',
                  reached
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-edge text-muted',
                )}
              >
                {row.tier}
              </span>

              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  {reached ? (
                    <Check className="size-3 shrink-0 text-emerald" />
                  ) : (
                    <Lock className="size-3 shrink-0 text-muted/50" />
                  )}
                  <span
                    className={cn('truncate text-xs', reached ? 'text-bone' : 'text-muted')}
                  >
                    {row.free_reward}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 truncate">
                  <Gift className="size-3 shrink-0 text-legendary/70" />
                  <span
                    className={cn(
                      'truncate text-xs',
                      isMilestone ? 'text-legendary' : 'text-muted',
                    )}
                  >
                    {row.premium_reward}
                  </span>
                </div>
              </div>

              <span className="tabular shrink-0 text-[10px] text-muted">
                {smartNumber(row.xp_required)}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
        The premium track sells cosmetics: frames, auras, trails, boss skins. It grants no damage,
        no XP and no coins. Nothing in this game can be bought with money that affects a fight.
      </p>
    </PageShell>
  );
}
