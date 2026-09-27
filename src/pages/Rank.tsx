/**
 * The rank ladder: where you stand, what each tier unlocks, and the decay
 * warning if you have been away.
 */

import { AlertTriangle, Check, Lock } from 'lucide-react';
import { useGameStore } from '@/state';
import { useRankState } from '@/hooks/useGame';
import { PageShell } from '@/components/common/Layout';
import { Badge, Progress } from '@/components/ui/misc';
import { RankBadge } from '@/components/rank/RankBadge';
import { StarDivider, EightPointStar } from '@/components/common/StarDivider';
import { RANKS, divisionLabel, xpToNextTier } from '@/game/ranks/rankLogic';
import { daysUntilDecay, decayPercentForDays, daysBetween } from '@/game/ranks/decay';
import { today as todayISO } from '@/lib/date';
import { smartNumber, formatPercent, formatMultiplier } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function RankPage() {
  const character = useGameStore((s) => s.character);
  const rank = useRankState();

  if (!character || !rank) return null;

  const date = todayISO();
  const untilDecay = daysUntilDecay(character.last_habit_date, date);
  const daysAway = character.last_habit_date ? daysBetween(character.last_habit_date, date) : 0;
  const activeDecay = decayPercentForDays(daysAway);
  const toNext = xpToNextTier(character.rank_xp);

  return (
    <PageShell title="Rank" subtitle="Ten tiers. Three divisions each. Khalifa is the last.">
      {/* Current standing */}
      <div className="panel framed p-5 text-center">
        <RankBadge tier={rank.tier} size={104} className="mx-auto justify-center" />

        <h2
          className="mt-4 font-display text-3xl"
          style={{ color: rank.def.accent ?? rank.def.color }}
        >
          {rank.def.name} {divisionLabel(rank.division)}
        </h2>
        <p className="font-arabic text-lg text-muted">{rank.def.arabic}</p>
        <p className="mt-1 text-sm text-muted">{rank.def.english}</p>

        <div className="mt-5 space-y-3 text-left">
          <div>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-muted">Division {divisionLabel(rank.division)}</span>
              <span className="tabular text-gold">{formatPercent(rank.division_progress)}</span>
            </div>
            <Progress value={rank.division_progress} barClassName="bg-gold" />
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-muted">Tier progress</span>
              <span className="tabular text-muted">
                {smartNumber(rank.xp_into_tier)} /{' '}
                {rank.xp_for_tier > 0 ? smartNumber(rank.xp_for_tier) : '∞'}
              </span>
            </div>
            <Progress
              value={rank.xp_for_tier > 0 ? rank.xp_into_tier / rank.xp_for_tier : 1}
              barClassName="bg-gradient-to-r from-gold to-legendary"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="panel-inset p-2.5">
            <p className="tabular font-display text-base text-gold">
              {smartNumber(character.rank_xp)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Lifetime rank XP</p>
          </div>
          <div className="panel-inset p-2.5">
            <p className="tabular font-display text-base text-gold">
              {toNext === null ? '—' : smartNumber(toNext)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">
              {toNext === null ? 'Highest rank' : 'To next tier'}
            </p>
          </div>
        </div>
      </div>

      {/* Decay */}
      {(activeDecay > 0 || (untilDecay !== null && untilDecay <= 1)) && (
        <div
          className={cn(
            'panel mt-4 flex items-start gap-3 p-4',
            activeDecay > 0 ? 'border-danger/50' : 'border-gold/40',
          )}
        >
          <AlertTriangle
            className={cn('mt-0.5 size-5 shrink-0', activeDecay > 0 ? 'text-danger' : 'text-gold')}
          />
          <div>
            <p className="font-display text-sm text-bone">
              {activeDecay > 0 ? 'Rank is decaying' : 'Decay begins soon'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {activeDecay > 0
                ? `You have been away ${daysAway} days. ${formatPercent(activeDecay)} of your rank XP is lost per day away — but never below your current division's floor.`
                : `Complete one habit today and nothing is lost. Decay starts after three days away.`}
            </p>
            <p className="mt-1.5 text-xs text-emerald">
              Return within three days of a break and you gain +15% rank XP instead.
            </p>
          </div>
        </div>
      )}

      {/* Ladder */}
      <StarDivider label="The ladder" className="mt-6" />

      <ol className="space-y-2">
        {RANKS.map((def) => {
          const reached = character.rank_tier >= def.tier;
          const current = character.rank_tier === def.tier;
          const accent = def.accent ?? def.color;

          return (
            <li
              key={def.tier}
              className={cn(
                'panel flex items-start gap-3 p-3 transition-all',
                current && 'border-gold shadow-gold',
                !reached && 'opacity-60',
              )}
            >
              <RankBadge tier={def.tier} size={44} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="font-display text-base" style={{ color: accent }}>
                    {def.name}
                  </h3>
                  <span className="font-arabic text-sm text-muted">{def.arabic}</span>
                  {current && <Badge variant="gold">You</Badge>}
                </div>

                <p className="text-xs text-muted">{def.english}</p>

                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="stat-chip">
                    {def.xp_required === 0 ? 'Start' : `${smartNumber(def.xp_required)} XP`}
                  </span>
                  <span className="stat-chip text-gold">
                    {formatMultiplier(def.multiplier)} damage
                  </span>
                  <span className="stat-chip">
                    {def.max_habits === 99 ? '∞' : def.max_habits} habits
                  </span>
                </div>

                <ul className="mt-2 space-y-0.5">
                  {def.unlocks.map((unlock) => (
                    <li key={unlock} className="flex items-center gap-1.5 text-[11px] text-muted">
                      {reached ? (
                        <Check className="size-3 shrink-0 text-emerald" />
                      ) : (
                        <Lock className="size-3 shrink-0 text-muted/50" />
                      )}
                      {unlock}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Divisions explainer */}
      <div className="panel mt-6 p-4">
        <div className="mb-2 flex items-center gap-2">
          <EightPointStar size={12} className="text-gold" />
          <p className="heading-rule">How divisions work</p>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Each tier is split into three. You enter at <span className="text-bone">III</span>, climb
          through <span className="text-bone">II</span>, and reach{' '}
          <span className="text-bone">I</span> just before the next tier. Decay can cost you
          divisions, but never drops you below the floor of the division you are standing in.
        </p>
      </div>
    </PageShell>
  );
}
