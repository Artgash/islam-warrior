/**
 * The Road: all 66 zones as a vertical journey. Cleared zones are marked,
 * the current one glows, everything beyond is shrouded.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Lock, Skull, Swords } from 'lucide-react';
import { ZONES } from '@/game/zones/zones';
import { buildZoneMonsters } from '@/game/zones/monsters';
import { MONSTERS_PER_ZONE, BOSS_INDEX } from '@/game/constants';
import { roadProgress } from '@/game/battle/combat';
import { useGameStore } from '@/state';
import { PageShell } from '@/components/common/Layout';
import { Progress, Badge } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EightPointStar } from '@/components/common/StarDivider';
import { MonsterSprite } from '@/components/battle/Sprites';
import { smartNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function RoadPage() {
  const character = useGameStore((s) => s.character);
  const [preview, setPreview] = useState<number | null>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  // Drop the player at their own position rather than at zone 1.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  if (!character) return null;

  const progress = roadProgress(character.current_zone, character.current_monster_index);

  return (
    <PageShell
      title="The Road"
      subtitle={`${ZONES.length} zones between you and the Throne`}
    >
      {/* Overall progress */}
      <div className="panel mb-5 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="heading-rule">Total progress</span>
          <span className="tabular text-sm text-gold">{formatPercent(progress, 2)}</span>
        </div>
        <Progress value={progress} height="h-2.5" />
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>Zone 1 — The Slums of Nafs</span>
          <span>Zone 66 — The Throne</span>
        </div>
      </div>

      <ol className="relative space-y-2.5">
        {/* The road itself */}
        <span
          aria-hidden="true"
          className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald via-gold/40 to-iblis/50"
        />

        {ZONES.map((zone) => {
          const cleared = zone.id < character.current_zone;
          const current = zone.id === character.current_zone;
          const locked = zone.id > character.current_zone;

          return (
            <li key={zone.id} ref={current ? currentRef : undefined} className="relative pl-12">
              {/* Node */}
              <span
                className={cn(
                  'absolute left-0 top-2 flex size-10 items-center justify-center rounded-full border-2 transition-all',
                  cleared && 'border-emerald bg-emerald/15 text-emerald',
                  current && 'border-gold bg-gold/15 text-gold shadow-gold',
                  locked && 'border-edge bg-night text-muted/50',
                )}
              >
                {cleared ? (
                  <Check className="size-4" />
                ) : current ? (
                  <Swords className="size-4" />
                ) : zone.id === 66 ? (
                  <Skull className="size-4" />
                ) : (
                  <Lock className="size-3.5" />
                )}
              </span>

              <button
                type="button"
                onClick={() => !locked && setPreview(zone.id)}
                disabled={locked}
                className={cn(
                  'panel w-full p-3 text-left transition-all',
                  current && 'border-gold/60 shadow-gold',
                  cleared && 'opacity-75 hover:opacity-100',
                  locked && 'cursor-default opacity-40',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted">
                      Zone {zone.id}
                    </p>
                    <h3
                      className={cn(
                        'truncate font-display text-base',
                        locked ? 'text-muted blur-[2px]' : 'text-bone',
                      )}
                    >
                      {locked ? '████████████' : zone.name}
                    </h3>
                    {!locked && (
                      <p className="mt-0.5 truncate text-xs text-muted">{zone.theme}</p>
                    )}
                  </div>

                  {current && <Badge variant="gold">You are here</Badge>}
                  {zone.id === 66 && !locked && <Badge variant="iblis">Final</Badge>}
                </div>

                {current && (
                  <div className="mt-2.5">
                    <Progress
                      value={character.current_monster_index / MONSTERS_PER_ZONE}
                      height="h-1.5"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      {character.current_monster_index} of {MONSTERS_PER_ZONE} cleared ·{' '}
                      {character.current_monster_index === BOSS_INDEX
                        ? `Facing ${zone.boss_name}`
                        : `Boss: ${zone.boss_name}`}
                    </p>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <ZonePreview zoneId={preview} onClose={() => setPreview(null)} />
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Zone preview                                                        */
/* ------------------------------------------------------------------ */

function ZonePreview({ zoneId, onClose }: { zoneId: number | null; onClose: () => void }) {
  const character = useGameStore((s) => s.character);
  const zone = zoneId ? ZONES.find((z) => z.id === zoneId) : null;
  const monsters = zoneId ? buildZoneMonsters(zoneId) : [];

  return (
    <Dialog open={Boolean(zone)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {zone && (
          <>
            <DialogHeader>
              <p className="heading-rule">Zone {zone.id}</p>
              <DialogTitle>{zone.name}</DialogTitle>
              <DialogDescription className="italic">&ldquo;{zone.lore}&rdquo;</DialogDescription>
            </DialogHeader>

            <div className="mb-3 flex items-center gap-2 text-xs">
              <Badge>{zone.theme}</Badge>
              <Badge variant="danger">Boss: {zone.boss_name}</Badge>
            </div>

            <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pr-1">
              {monsters.map((monster) => {
                const beaten =
                  character &&
                  (zone.id < character.current_zone ||
                    (zone.id === character.current_zone &&
                      monster.index < character.current_monster_index));

                return (
                  <div
                    key={monster.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border border-edge bg-night/40 p-2',
                      beaten && 'opacity-50',
                      monster.is_boss && 'border-crimson/50',
                    )}
                  >
                    <MonsterSprite monster={monster} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-bone">
                        {monster.is_boss && (
                          <EightPointStar size={10} className="mr-1 inline text-crimson" />
                        )}
                        {monster.name}
                      </p>
                      <p className="tabular text-[11px] text-muted">
                        {smartNumber(monster.max_hp)} HP · ATK {smartNumber(monster.attack)}
                      </p>
                    </div>
                    {beaten && <Check className="size-4 shrink-0 text-emerald" />}
                  </div>
                );
              })}
            </div>

            <Button variant="secondary" size="block" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
