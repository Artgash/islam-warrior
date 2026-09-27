/**
 * Full-screen celebration and consequence overlays.
 * Each one is dismissible, keyboard-accessible and animates within 1.5s.
 */

import { motion } from 'framer-motion';
import { Coins, Gem, Package, Sparkles, Swords, Trophy } from 'lucide-react';
import type { Achievement, LootResult, RankState } from '@/types';
import { Button } from '@/components/ui/button';
import { RankBadge } from '@/components/rank/RankBadge';
import { EightPointStar } from '@/components/common/StarDivider';
import { RARITY_COLORS } from '@/game/shop/gearStats';
import { getZone } from '@/game/zones/zones';
import { divisionLabel } from '@/game/ranks/rankLogic';
import { smartNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function OverlayShell({
  children,
  onDismiss,
  tone = 'gold',
}: {
  children: React.ReactNode;
  onDismiss: () => void;
  tone?: 'gold' | 'emerald' | 'iblis' | 'danger';
}) {
  const glow =
    tone === 'emerald'
      ? 'from-emerald/25'
      : tone === 'iblis'
        ? 'from-iblis/40'
        : tone === 'danger'
          ? 'from-danger/25'
          : 'from-gold/25';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-night/92 backdrop-blur-md" onClick={onDismiss} />
      <div className={cn('absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b to-transparent', glow)} />

      <motion.div
        initial={{ scale: 0.88, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="relative w-full max-w-sm text-center"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Level up                                                            */
/* ------------------------------------------------------------------ */

export function LevelUpOverlay({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  return (
    <OverlayShell onDismiss={onDismiss}>
      {/* The golden light column. */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1.6, opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        className="light-column absolute left-1/2 top-1/2 h-[420px] w-24 -translate-x-1/2 -translate-y-1/2 blur-xl"
      />

      {/* Geometric bloom */}
      <motion.div
        initial={{ scale: 0, rotate: -45, opacity: 0 }}
        animate={{ scale: 1.6, rotate: 45, opacity: [0, 0.7, 0] }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gold"
      >
        <EightPointStar size={220} />
      </motion.div>

      <div className="relative">
        <p className="heading-rule mb-2">Level up</p>
        <p className="tabular font-display text-7xl font-bold text-gold drop-shadow-[0_0_25px_rgba(212,175,55,0.5)]">
          {level}
        </p>
        <p className="mt-4 text-sm text-muted">
          +20 max HP · +3 attack · +2 defense · fully restored
        </p>
        <Button className="mt-6 w-full" onClick={onDismiss}>
          Return to the fight
        </Button>
      </div>
    </OverlayShell>
  );
}

/* ------------------------------------------------------------------ */
/* Rank change                                                         */
/* ------------------------------------------------------------------ */

export function RankUpOverlay({
  rank,
  promoted,
  onDismiss,
}: {
  rank: RankState;
  promoted: boolean;
  onDismiss: () => void;
}) {
  return (
    <OverlayShell onDismiss={onDismiss} tone={promoted ? 'gold' : 'danger'}>
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: `${rank.def.accent ?? rank.def.color}40` }}
      />

      <div className="relative flex flex-col items-center">
        <p className="heading-rule mb-4">{promoted ? 'Rank attained' : 'Rank lost'}</p>

        <motion.div
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        >
          <RankBadge tier={rank.tier} size={128} />
        </motion.div>

        <h2
          className="mt-5 font-display text-3xl"
          style={{ color: rank.def.accent ?? rank.def.color }}
        >
          {rank.def.name} {divisionLabel(rank.division)}
        </h2>
        <p className="font-arabic text-lg text-muted">{rank.def.arabic}</p>
        <p className="mt-1 text-sm text-muted">{rank.def.english}</p>

        {promoted && rank.def.unlocks.length > 0 && (
          <ul className="mt-5 w-full space-y-1.5 rounded-lg border border-edge bg-night/50 p-3 text-left text-sm">
            {rank.def.unlocks.map((unlock) => (
              <li key={unlock} className="flex items-center gap-2 text-bone">
                <Sparkles className="size-3.5 shrink-0 text-gold" />
                {unlock}
              </li>
            ))}
          </ul>
        )}

        <Button className="mt-6 w-full" onClick={onDismiss}>
          Continue
        </Button>
      </div>
    </OverlayShell>
  );
}

/* ------------------------------------------------------------------ */
/* Loot                                                                */
/* ------------------------------------------------------------------ */

const LOOT_ICONS = {
  coins: Coins,
  consumable: Package,
  gear: Swords,
  rare_gear: Swords,
  legendary_fragment: Gem,
} as const;

export function LootOverlay({
  loot,
  onDismiss,
}: {
  loot: LootResult[];
  onDismiss: () => void;
}) {
  return (
    <OverlayShell onDismiss={onDismiss} tone="emerald">
      <div className="panel framed relative p-5">
        <p className="heading-rule mb-4">Spoils</p>

        <ul className="space-y-2">
          {loot.map((item, i) => {
            const Icon = LOOT_ICONS[item.kind];
            const color = item.rarity ? RARITY_COLORS[item.rarity] : '#D4AF37';

            return (
              <motion.li
                key={`${item.kind}-${i}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                className="flex items-center gap-3 rounded-lg border border-edge bg-night/60 p-3 text-left"
              >
                <Icon className="size-5 shrink-0" style={{ color }} />
                <div className="min-w-0 flex-1">
                  {item.item_name && (
                    <p className="truncate font-display text-sm" style={{ color }}>
                      {item.item_name}
                    </p>
                  )}
                  <p className="text-xs text-muted">{item.message}</p>
                </div>
                {item.coins > 0 && (
                  <span className="tabular shrink-0 text-sm text-gold">
                    +{smartNumber(item.coins)}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ul>

        <Button className="mt-5 w-full" onClick={onDismiss}>
          Take it all
        </Button>
      </div>
    </OverlayShell>
  );
}

/* ------------------------------------------------------------------ */
/* Zone cleared                                                        */
/* ------------------------------------------------------------------ */

export function ZoneClearOverlay({
  zoneId,
  onDismiss,
}: {
  zoneId: number;
  onDismiss: () => void;
}) {
  const zone = getZone(zoneId);
  const previous = getZone(Math.max(1, zoneId - 1));

  return (
    <OverlayShell onDismiss={onDismiss} tone="emerald">
      <div className="relative">
        <motion.div
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full border-2 border-emerald bg-emerald/10"
        >
          <Trophy className="size-9 text-emerald" />
        </motion.div>

        <p className="heading-rule mb-1">Zone cleared</p>
        <h2 className="font-display text-2xl text-bone">{previous.name}</h2>
        <p className="mt-1 text-sm text-muted">
          {previous.boss_name} has fallen. The road opens.
        </p>

        <div className="panel mt-6 p-4 text-left">
          <p className="heading-rule mb-1">Now entering</p>
          <h3 className="font-display text-lg text-gold">
            Zone {zone.id} — {zone.name}
          </h3>
          <p className="mt-2 text-sm italic text-muted">&ldquo;{zone.lore}&rdquo;</p>
        </div>

        <Button className="mt-6 w-full" onClick={onDismiss}>
          Walk on
        </Button>
      </div>
    </OverlayShell>
  );
}

/* ------------------------------------------------------------------ */
/* Achievement                                                         */
/* ------------------------------------------------------------------ */

export function AchievementToast({
  achievement,
  onDismiss,
}: {
  achievement: Achievement;
  onDismiss: () => void;
}) {
  const color = RARITY_COLORS[achievement.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="panel framed pointer-events-auto flex w-full max-w-sm items-center gap-3 p-3"
      style={{ borderColor: `${color}66` }}
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-lg border"
        style={{ borderColor: color, backgroundColor: `${color}1A` }}
      >
        <Trophy className="size-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate font-display text-sm" style={{ color }}>
          {achievement.name}
        </p>
        <p className="line-clamp-2 text-xs text-muted">{achievement.description}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </Button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Fallen                                                              */
/* ------------------------------------------------------------------ */

export function FallenOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <OverlayShell onDismiss={onDismiss} tone="danger">
      <div className="relative">
        <p className="heading-rule mb-2 text-danger">You have fallen</p>
        <h2 className="font-display text-2xl text-bone">Rest. Recover. Return tomorrow.</h2>
        <p className="mt-3 text-sm text-muted">
          Nothing is lost. Your streak, your zone and your gear are exactly where you left them.
          Come back tomorrow and a comeback bonus is waiting.
        </p>
        <Button variant="secondary" className="mt-6 w-full" onClick={onDismiss}>
          Understood
        </Button>
      </div>
    </OverlayShell>
  );
}
