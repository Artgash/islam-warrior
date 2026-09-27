/**
 * The character sheet: warrior art, the six-stat hexagon, equipped gear in
 * six slots, level and rank progress.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Shirt, Sparkles } from 'lucide-react';
import type { GearSlot, StatKey } from '@/types';
import { useCharacter } from '@/hooks/useGame';
import { useGameStore } from '@/state';
import { PageShell } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, Progress } from '@/components/ui/misc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WarriorSprite } from '@/components/battle/Sprites';
import { RankBadge } from '@/components/rank/RankBadge';
import { StarDivider } from '@/components/common/StarDivider';
import { STAT_ARABIC, STAT_LABELS, TITLES } from '@/game/constants';
import { GEAR_SLOTS, SLOT_LABELS, RARITY_COLORS, getGear } from '@/game/shop/gearStats';
import { divisionLabel } from '@/game/ranks/rankLogic';
import { totalStatPoints } from '@/game/character/stats';
import { smartNumber, formatPercent, formatMultiplier } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function CharacterPage() {
  const { character, totals, stats, rank, levelProgress, xpToNext } = useCharacter();
  const equipped = useGameStore((s) => s.equipped);
  const inventory = useGameStore((s) => s.inventory);
  const unequipSlot = useGameStore((s) => s.unequipSlot);
  const equipItem = useGameStore((s) => s.equipItem);
  const setTitle = useGameStore((s) => s.setTitle);
  const achievements = useGameStore((s) => s.achievements);

  const [slotPicker, setSlotPicker] = useState<GearSlot | null>(null);
  const [titlePicker, setTitlePicker] = useState(false);

  if (!character || !rank || !totals) return null;

  const statKeys = Object.keys(stats) as StatKey[];
  const maxStat = Math.max(10, ...statKeys.map((k) => stats[k]));

  return (
    <PageShell title={character.name} subtitle={character.title ?? undefined}>
      {/* Hero */}
      <div className="panel framed relative overflow-hidden p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <RankBadge tier={rank.tier} division={rank.division} size={48} showLabel />

            <div className="mt-4">
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="text-muted">Level {character.level}</span>
                <span className="tabular text-muted">
                  {smartNumber(character.xp)} / {smartNumber(xpToNext)}
                </span>
              </div>
              <Progress value={levelProgress} />
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="text-muted">
                  {rank.def.name} {divisionLabel(rank.division)}
                </span>
                <span className="tabular text-muted">{formatPercent(rank.division_progress)}</span>
              </div>
              <Progress
                value={rank.division_progress}
                barClassName="bg-gradient-to-r from-gold to-legendary"
              />
            </div>
          </div>

          <WarriorSprite rankTier={character.rank_tier} size={124} />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <Metric label="Attack" value={smartNumber(totals.attack)} />
          <Metric label="Defense" value={smartNumber(totals.defense)} />
          <Metric label="Max HP" value={smartNumber(totals.max_hp)} />
          <Metric label="Crit" value={formatPercent(totals.crit_chance, 1)} />
        </div>

        {(totals.morale > 1 || totals.xp_boost > 1) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {totals.morale > 1 && (
              <Badge variant="iblis">Morale {formatMultiplier(totals.morale)}</Badge>
            )}
            {totals.xp_boost > 1 && (
              <Badge variant="emerald">XP {formatMultiplier(totals.xp_boost)}</Badge>
            )}
            <Badge variant="gold">Rank {formatMultiplier(rank.def.multiplier)}</Badge>
          </div>
        )}
      </div>

      {/* Stats hexagon */}
      <StarDivider label="Stats" className="mt-6" />

      <div className="panel p-4">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <StatHexagon stats={stats} max={maxStat} />

          <div className="w-full flex-1 space-y-2">
            {statKeys.map((key) => (
              <div key={key}>
                <div className="mb-0.5 flex items-baseline justify-between text-xs">
                  <span className="text-bone">
                    {STAT_LABELS[key]}{' '}
                    <span className="font-arabic text-muted">{STAT_ARABIC[key]}</span>
                  </span>
                  <span className="tabular text-gold">{stats[key]}</span>
                </div>
                <Progress value={stats[key] / 999} height="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Total stat points:{' '}
          <span className="tabular text-gold">{smartNumber(totalStatPoints(stats))}</span> / 5,994
        </p>
      </div>

      {/* Gear */}
      <StarDivider label="Equipment" className="mt-6" />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {GEAR_SLOTS.map((slot) => {
          const itemId = equipped[slot];
          const item = itemId ? getGear(itemId) : undefined;
          const color = item ? RARITY_COLORS[item.rarity] : '#2A3348';

          return (
            <button
              key={slot}
              type="button"
              onClick={() => setSlotPicker(slot)}
              className={cn(
                'panel flex min-h-[92px] flex-col justify-between p-3 text-left transition-all hover:border-gold/50',
                item && 'shadow-inset',
              )}
              style={item ? { borderColor: `${color}66` } : undefined}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted">
                {SLOT_LABELS[slot]}
              </p>

              {item ? (
                <>
                  <p
                    className={cn(
                      'line-clamp-2 font-display text-xs leading-tight',
                      item.rarity === 'legendary' || item.rarity === 'mythic' ? 'foil' : '',
                    )}
                    style={
                      item.rarity !== 'legendary' && item.rarity !== 'mythic'
                        ? { color }
                        : undefined
                    }
                  >
                    {item.name}
                  </p>
                  <div className="flex flex-wrap gap-1 text-[10px] text-muted">
                    {item.stats.attack ? <span>+{item.stats.attack} ATK</span> : null}
                    {item.stats.defense ? <span>+{item.stats.defense} DEF</span> : null}
                    {item.stats.hp ? <span>+{item.stats.hp} HP</span> : null}
                    {item.stats.crit_chance ? (
                      <span>+{formatPercent(item.stats.crit_chance, 1)} crit</span>
                    ) : null}
                    {item.stats.dodge ? (
                      <span>+{formatPercent(item.stats.dodge, 0)} dodge</span>
                    ) : null}
                    {item.stats.all_stats ? <span>+{item.stats.all_stats} all</span> : null}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted/50">Empty</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Titles */}
      <StarDivider label="Title" className="mt-6" />

      <button
        type="button"
        onClick={() => setTitlePicker(true)}
        className="panel flex w-full items-center justify-between p-4 text-left transition-all hover:border-gold/50"
      >
        <div>
          <p className="font-display text-base text-gold">
            {character.title ?? 'No title chosen'}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {achievements.length} achievement{achievements.length === 1 ? '' : 's'} unlocked
          </p>
        </div>
        <Sparkles className="size-4 shrink-0 text-muted" />
      </button>

      {/* Slot picker */}
      <Dialog open={Boolean(slotPicker)} onOpenChange={(o) => !o && setSlotPicker(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{slotPicker ? SLOT_LABELS[slotPicker] : ''}</DialogTitle>
            <DialogDescription>Equip anything you own for this slot.</DialogDescription>
          </DialogHeader>

          {(() => {
            if (!slotPicker) return null;
            const owned = inventory
              .map((e) => getGear(e.item_id))
              .filter((g): g is NonNullable<typeof g> => Boolean(g) && g!.slot === slotPicker);

            if (owned.length === 0) {
              return (
                <EmptyState
                  icon={<Shirt className="size-8" />}
                  title="Nothing for this slot"
                  description="Visit the shop, or keep killing — gear drops from the road."
                />
              );
            }

            return (
              <div className="space-y-2">
                {equipped[slotPicker] && (
                  <Button
                    variant="ghost"
                    size="block"
                    onClick={() => {
                      unequipSlot(slotPicker);
                      toast.success('Unequipped.');
                      setSlotPicker(null);
                    }}
                  >
                    Unequip current
                  </Button>
                )}

                {owned.map((item) => {
                  const isEquipped = equipped[slotPicker] === item.id;
                  const color = RARITY_COLORS[item.rarity];

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        equipItem(item.id);
                        toast.success(`${item.name} equipped.`);
                        setSlotPicker(null);
                      }}
                      disabled={isEquipped}
                      className={cn(
                        'panel w-full p-3 text-left transition-all',
                        isEquipped ? 'border-gold opacity-70' : 'hover:border-gold/50',
                      )}
                      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm" style={{ color }}>
                          {item.name}
                        </p>
                        {isEquipped && <Badge variant="gold">Equipped</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted">{item.description}</p>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Title picker */}
      <Dialog open={titlePicker} onOpenChange={setTitlePicker}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a title</DialogTitle>
            <DialogDescription>
              Titles are earned. Locked ones show what unlocks them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {TITLES.map((title) => {
              const unlocked =
                title.id === 'title_newborn' || achievements.length >= TITLES.indexOf(title);
              return (
                <button
                  key={title.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    setTitle(title.label);
                    toast.success(`Title set: ${title.label}`);
                    setTitlePicker(false);
                  }}
                  className={cn(
                    'panel w-full p-3 text-left transition-all',
                    unlocked ? 'hover:border-gold/50' : 'opacity-40',
                    character.title === title.label && 'border-gold',
                  )}
                >
                  <p className="font-display text-sm text-bone">{title.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{title.requirement}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Hexagon                                                             */
/* ------------------------------------------------------------------ */

const HEX_ORDER: StatKey[] = [
  'strength',
  'endurance',
  'defense_stat',
  'faith',
  'intelligence',
  'charisma',
];

function StatHexagon({ stats, max }: { stats: Record<StatKey, number>; max: number }) {
  const size = 180;
  const center = size / 2;
  const radius = size / 2 - 26;

  const point = (index: number, ratio: number) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    return [center + radius * ratio * Math.cos(angle), center + radius * ratio * Math.sin(angle)];
  };

  const ring = (ratio: number) =>
    HEX_ORDER.map((_, i) => point(i, ratio).join(',')).join(' ');

  const shape = HEX_ORDER.map((key, i) => point(i, stats[key] / max).join(',')).join(' ');

  return (
    <svg width={size} height={size} role="img" aria-label="Stat distribution">
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={ring(r)} fill="none" stroke="#2A3348" strokeWidth="1" />
      ))}

      {/* Axes */}
      {HEX_ORDER.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#2A3348" strokeWidth="1" />;
      })}

      {/* Value shape */}
      <polygon points={shape} fill="#D4AF37" fillOpacity="0.25" stroke="#D4AF37" strokeWidth="2" />

      {/* Vertices */}
      {HEX_ORDER.map((key, i) => {
        const [x, y] = point(i, stats[key] / max);
        return <circle key={key} cx={x} cy={y} r="3" fill="#FBBF24" />;
      })}

      {/* Labels */}
      {HEX_ORDER.map((key, i) => {
        const [x, y] = point(i, 1.22);
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="#A8B0C0"
          >
            {STAT_LABELS[key].slice(0, 4)}
          </text>
        );
      })}
    </svg>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-inset p-2 text-center">
      <p className="tabular font-display text-sm text-gold">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
