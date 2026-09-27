/**
 * Home: the battle. Warrior on the left, the current monster on the right,
 * today's habits as move buttons underneath.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Flame, Info, Moon, Zap } from 'lucide-react';
import type { Habit } from '@/types';
import { useBattle, useCombatTotals, useHabits, useIblis, useRankState } from '@/hooks/useGame';
import { useGameStore } from '@/state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HPBar, FloatingDamage } from '@/components/battle/HPBar';
import { MonsterSprite, WarriorSprite } from '@/components/battle/Sprites';
import { CombatLog } from '@/components/battle/CombatLog';
import { MoveButton } from '@/components/battle/MoveButton';
import {
  FallenOverlay,
  LevelUpOverlay,
  LootOverlay,
  RankUpOverlay,
  ZoneClearOverlay,
} from '@/components/battle/Overlays';
import {
  AshBurst,
  ComboFlare,
  DangerVignette,
  ImpactFlash,
  ScreenShake,
  SparkBurst,
} from '@/components/battle/Effects';
import { TauntOverlay } from '@/components/iblis/TauntOverlay';
import { StarDivider } from '@/components/common/StarDivider';
import { PageShell } from '@/components/common/Layout';
import { smartNumber, formatMultiplier } from '@/lib/format';
import { comboMultiplier } from '@/game/battle/formulas';
import { MONSTERS_PER_ZONE, IBLIS_HP_DISPLAY } from '@/game/constants';
import { cn } from '@/lib/utils';

export default function BattlePage() {
  const { character, monster, zone, combatLog, lastDamage, fallen, combo, previewDamage } =
    useBattle();
  const { todayHabits, completeHabit } = useHabits();
  const { activeTaunt, replyToTaunt, dismissTaunt } = useIblis();

  const rank = useRankState();
  const totals = useCombatTotals();
  const settings = useGameStore((s) => s.settings);

  const pendingLoot = useGameStore((s) => s.pendingLoot);
  const pendingLevelUp = useGameStore((s) => s.pendingLevelUp);
  const pendingRankUp = useGameStore((s) => s.pendingRankUp);
  const pendingZoneClear = useGameStore((s) => s.pendingZoneClear);
  const dismissLoot = useGameStore((s) => s.dismissLoot);
  const dismissLevelUp = useGameStore((s) => s.dismissLevelUp);
  const dismissRankUp = useGameStore((s) => s.dismissRankUp);
  const dismissZoneClear = useGameStore((s) => s.dismissZoneClear);

  const [confirming, setConfirming] = useState<Habit | null>(null);
  const [monsterHit, setMonsterHit] = useState(false);
  const [warriorAttacking, setWarriorAttacking] = useState(false);
  const [monsterDying, setMonsterDying] = useState(false);
  const [showFallen, setShowFallen] = useState(false);

  // Announce the fallen state once, when it first happens.
  useEffect(() => {
    if (fallen) setShowFallen(true);
  }, [fallen]);

  if (!character || !monster || !zone) return null;

  const fire = (habit: Habit) => {
    setConfirming(null);

    setWarriorAttacking(true);
    setMonsterHit(true);
    setTimeout(() => {
      setWarriorAttacking(false);
      setMonsterHit(false);
    }, 280);

    const result = completeHabit(habit.id);

    if (!result?.ok) {
      const message =
        result?.reason === 'already_done'
          ? 'Already done today. Come back tomorrow.'
          : result?.reason === 'fallen'
            ? 'You have fallen. Rest until tomorrow.'
            : 'That move could not fire.';
      toast.error(message);
      return;
    }

    if (result.monster_killed) {
      setMonsterDying(true);
      setTimeout(() => setMonsterDying(false), 950);
    }

    toast.success(
      `${habit.name} — ${smartNumber(result.damage)} damage${result.was_crit ? ' (CRIT)' : ''}`,
      { description: `+${smartNumber(result.xp)} XP · +${smartNumber(result.coins)} coins` },
    );
  };

  const onPress = (habit: Habit) => {
    if (settings.confirm_before_move) {
      setConfirming(habit);
    } else {
      fire(habit);
    }
  };

  const monsterPct = (character.current_monster_hp / monster.max_hp) * 100;
  const comboMult = comboMultiplier(combo);

  const hpRatio = character.hp / (totals?.max_hp ?? character.max_hp);

  return (
    <>
      {/* Screen edges pulse red once the player is nearly down. */}
      {!fallen && <DangerVignette ratio={hpRatio} />}

      <PageShell>
        {/* Zone header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="heading-rule">
              Zone {zone.id} · {monster.is_boss ? 'Zone boss' : `Monster ${monster.index + 1} of ${MONSTERS_PER_ZONE}`}
            </p>
            <h1 className="truncate font-display text-lg text-bone">{zone.name}</h1>
          </div>
          <Link to="/road">
            <Button variant="ghost" size="sm">
              The Road
            </Button>
          </Link>
        </div>

        {/* Arena */}
        <div
          className={cn(
            'panel framed relative overflow-hidden p-4 transition-colors',
            monster.is_boss && 'border-crimson/60 shadow-crimson',
          )}
        >
          {monster.is_boss && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-crimson/20 to-transparent" />
          )}

          <ImpactFlash trigger={lastDamage?.at ?? null} crit={Boolean(lastDamage?.crit)} />

          {/* Monster HP */}
          <div className="relative mb-4">
            <div className="mb-1 flex items-center gap-2">
              {monster.is_boss && <Badge variant="danger">Zone Boss</Badge>}
              {zone.id === 66 && <Badge variant="iblis">Final</Badge>}
            </div>
            <HPBar
              current={character.current_monster_hp}
              max={monster.max_hp}
              maxExact={monster.max_hp_exact}
              label={monster.name}
              variant={monster.is_boss ? 'boss' : 'monster'}
            />
            {monster.max_hp_exact && (
              <p className="tabular mt-1 text-center text-[10px] text-muted">
                {IBLIS_HP_DISPLAY} HP
              </p>
            )}
          </div>

          {/* Combatants. The whole row shakes on impact. */}
          <ScreenShake
            trigger={lastDamage?.at ?? null}
            intensity={lastDamage?.crit ? 'heavy' : 'normal'}
            className="relative flex items-end justify-between gap-2"
          >
            <div className="relative">
              <WarriorSprite
                rankTier={character.rank_tier}
                attacking={warriorAttacking}
                fallen={fallen}
                size={132}
              />
            </div>

            <div className="relative">
              <MonsterSprite
                monster={monster}
                hit={monsterHit}
                dying={monsterDying}
                size={monster.is_boss ? 152 : 132}
              />

              <SparkBurst trigger={lastDamage?.at ?? null} crit={Boolean(lastDamage?.crit)} />
              <AshBurst active={monsterDying} />

              <AnimatePresence>
                {lastDamage && (
                  <FloatingDamage
                    amount={lastDamage.amount}
                    crit={lastDamage.crit}
                    keyId={lastDamage.at}
                  />
                )}
              </AnimatePresence>
            </div>
          </ScreenShake>

          {/* Player HP */}
          <div className="relative mt-4">
            <HPBar
              current={character.hp}
              max={totals?.max_hp ?? character.max_hp}
              label={character.name}
              variant="player"
            />
          </div>

          {/* Status strip */}
          <div className="relative mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={cn(
                'stat-chip relative overflow-hidden',
                combo > 2 && 'border-gold text-gold shadow-gold',
              )}
            >
              <ComboFlare combo={combo} />
              <Zap className="size-3" />
              Combo {combo} · {formatMultiplier(comboMult)}
            </span>

            {totals && totals.morale > 1 && (
              <span className="stat-chip border-iblis/60 text-[#C4B5FD]">
                Morale +{Math.round((totals.morale - 1) * 100)}%
              </span>
            )}

            {totals && totals.xp_boost > 1 && (
              <span className="stat-chip border-emerald/50 text-emerald">
                XP {formatMultiplier(totals.xp_boost)}
              </span>
            )}

            {rank && (
              <span className="stat-chip">
                Rank {formatMultiplier(rank.def.multiplier)}
              </span>
            )}

            <span className="stat-chip">
              <Flame className={cn('size-3', character.streak > 0 && 'text-gold')} />
              {character.streak}d streak
            </span>
          </div>
        </div>

        {/* Combat log */}
        <CombatLog events={combatLog} limit={5} className="mt-3" />

        {/* Moves */}
        <StarDivider label="Your moves" className="mt-5" />

        {fallen ? (
          <div className="panel flex flex-col items-center gap-3 p-6 text-center">
            <Moon className="size-8 text-muted" />
            <h3 className="font-display text-lg text-bone">You have fallen</h3>
            <p className="max-w-sm text-sm text-muted">
              The battle is paused until tomorrow. Your zone, streak and gear are untouched — and a
              comeback bonus is waiting when you return.
            </p>
            <Link to="/habits">
              <Button variant="secondary">Review your habits</Button>
            </Link>
          </div>
        ) : todayHabits.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 p-6 text-center">
            <Info className="size-7 text-muted" />
            <h3 className="font-display text-base text-bone">No habits scheduled today</h3>
            <p className="max-w-sm text-sm text-muted">
              Moves come from habits. Add one and it becomes a strike.
            </p>
            <Link to="/habits">
              <Button>Add a habit</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {todayHabits.map(({ habit, completed }) => (
              <MoveButton
                key={habit.id}
                habit={habit}
                completed={completed}
                estimatedDamage={previewDamage(habit)}
                onPress={onPress}
              />
            ))}
          </div>
        )}

        {/* Monster detail */}
        <div className="panel mt-4 p-4">
          <p className="heading-rule mb-1.5">{monster.name}</p>
          <p className="text-sm leading-relaxed text-muted">{monster.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="stat-chip">ATK {smartNumber(monster.attack)}</span>
            <span className="stat-chip">DEF {smartNumber(monster.defense)}</span>
            <span className="stat-chip text-gold">+{smartNumber(monster.xp_reward)} XP</span>
            <span className="stat-chip text-gold">+{smartNumber(monster.coin_reward)} coins</span>
            <span className="stat-chip">{Math.round(monsterPct)}% left</span>
          </div>
        </div>
      </PageShell>

      {/* Confirmation */}
      <Dialog open={Boolean(confirming)} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirming?.name}</DialogTitle>
            <DialogDescription>
              {confirming?.category === 'bad_habit'
                ? 'Did you resist this today? Answer honestly — the whole system rests on it.'
                : 'Did you actually complete this? Answer honestly — the whole system rests on it.'}
            </DialogDescription>
          </DialogHeader>

          {confirming && (
            <div className="rounded-lg border border-edge bg-night/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Estimated damage</span>
                <span className="tabular text-gold">{smartNumber(previewDamage(confirming))}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted">Combo after this</span>
                <span className="tabular text-bone">
                  {combo + 1} · {formatMultiplier(comboMultiplier(combo + 1))}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Not yet
            </Button>
            <Button onClick={() => confirming && fire(confirming)}>Yes — strike</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlays */}
      <AnimatePresence>
        {activeTaunt && (
          <TauntOverlay
            taunt={activeTaunt}
            onReply={(replyId) => replyToTaunt(replyId)}
            onDismiss={dismissTaunt}
          />
        )}
        {pendingLevelUp !== null && (
          <LevelUpOverlay level={pendingLevelUp} onDismiss={dismissLevelUp} />
        )}
        {pendingRankUp && rank && (
          <RankUpOverlay rank={rank} promoted onDismiss={dismissRankUp} />
        )}
        {pendingZoneClear !== null && (
          <ZoneClearOverlay zoneId={pendingZoneClear} onDismiss={dismissZoneClear} />
        )}
        {pendingLoot && <LootOverlay loot={pendingLoot} onDismiss={dismissLoot} />}
        {showFallen && fallen && <FallenOverlay onDismiss={() => setShowFallen(false)} />}
      </AnimatePresence>
    </>
  );
}
