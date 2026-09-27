/**
 * The shop: eight tabs, purchase and equip flows, comparison against what
 * you already wear, and the legendary forge.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Coins, Gem, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import type { ConsumableItem, GearItem, ShopTab } from '@/types';
import { useGameStore } from '@/state';
import { useRankState } from '@/hooks/useGame';
import { PageShell } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, Progress } from '@/components/ui/misc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarDivider } from '@/components/common/StarDivider';
import {
  ARMOR,
  BOOTS,
  CONSUMABLES,
  HELMETS,
  LEGENDARY_COSMETICS,
  RARITY_COLORS,
  RINGS,
  SHIELDS,
  SWORDS,
  SLOT_LABELS,
  getGear,
} from '@/game/shop/gearStats';
import { checkPurchase, compareEquip, ownsItem, quantityOf } from '@/game/shop/pricing';
import { FRAGMENTS_PER_LEGENDARY } from '@/game/constants';
import { hasShopAccess } from '@/game/ranks/rankLogic';
import { smartNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const TABS: { id: ShopTab; label: string; items: GearItem[] }[] = [
  { id: 'sword', label: 'Swords', items: SWORDS },
  { id: 'shield', label: 'Shields', items: SHIELDS },
  { id: 'armor', label: 'Armor', items: ARMOR },
  { id: 'helmet', label: 'Helmets', items: HELMETS },
  { id: 'ring', label: 'Rings', items: RINGS },
  { id: 'boots', label: 'Boots', items: BOOTS },
];

export default function ShopPage() {
  const character = useGameStore((s) => s.character);
  const rank = useRankState();
  const inventory = useGameStore((s) => s.inventory);
  const equipped = useGameStore((s) => s.equipped);
  const fragments = useGameStore((s) => s.legendaryFragments);

  const buyItem = useGameStore((s) => s.buyItem);
  const equipItem = useGameStore((s) => s.equipItem);
  const useConsumable = useGameStore((s) => s.useConsumable);
  const forgeLegendary = useGameStore((s) => s.forgeLegendary);

  const activeTab = useGameStore((s) => s.activeShopTab);
  const setActiveTab = useGameStore((s) => s.setActiveShopTab);

  const [pending, setPending] = useState<GearItem | ConsumableItem | null>(null);

  if (!character || !rank) return null;

  if (!hasShopAccess(character.rank_tier)) {
    return (
      <PageShell title="The Armoury">
        <EmptyState
          icon={<Lock className="size-10" />}
          title="The armoury is closed to you"
          description="Merchants deal with Talib and above. Keep striking — the second rank is not far."
        />
        <div className="panel mt-4 p-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-muted">Progress to Talib</span>
            <span className="tabular text-gold">
              {smartNumber(character.rank_xp)} / 500
            </span>
          </div>
          <Progress value={Math.min(1, character.rank_xp / 500)} />
        </div>
      </PageShell>
    );
  }

  const confirmPurchase = () => {
    if (!pending) return;
    const result = buyItem(pending.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setPending(null);
  };

  return (
    <PageShell title="The Armoury" subtitle="Nothing here buys victory. It only buys speed.">
      {/* Balance */}
      <div className="panel mb-4 flex items-center justify-between p-3.5">
        <div className="flex items-center gap-2">
          <Coins className="size-5 text-gold" />
          <span className="tabular font-display text-xl text-gold">
            {smartNumber(character.coins)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Gem className="size-3.5 text-[#A855F7]" />
            <span className="tabular">
              {fragments}/{FRAGMENTS_PER_LEGENDARY}
            </span>
          </span>
          {fragments >= FRAGMENTS_PER_LEGENDARY && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const result = forgeLegendary();
                toast[result.ok ? 'success' : 'error'](result.message);
              }}
            >
              Forge
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="consumable">Consumables</TabsTrigger>
          <TabsTrigger value="legendary">Legendary</TabsTrigger>
        </TabsList>

        {/* Gear tabs */}
        {TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <div className="space-y-2">
              {tab.items.map((item) => (
                <GearCard
                  key={item.id}
                  item={item}
                  owned={ownsItem(inventory, item.id)}
                  isEquipped={equipped[item.slot] === item.id}
                  coins={character.coins}
                  rankTier={character.rank_tier}
                  onBuy={() => setPending(item)}
                  onEquip={() => {
                    equipItem(item.id);
                    toast.success(`${item.name} equipped.`);
                  }}
                />
              ))}
            </div>
          </TabsContent>
        ))}

        {/* Consumables */}
        <TabsContent value="consumable">
          <div className="space-y-2">
            {CONSUMABLES.map((item) => {
              const qty = quantityOf(inventory, item.id);
              const check = checkPurchase(item.id, character.coins, character.rank_tier, inventory);

              return (
                <div key={item.id} className="panel p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="font-display text-sm text-bone">{item.name}</p>
                        {qty > 0 && <Badge variant="emerald">×{qty}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted">{item.description}</p>
                      {item.duration_hours > 0 && (
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted/70">
                          Lasts {item.duration_hours}h
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="tabular text-sm text-gold">{smartNumber(item.price)}</span>
                      <div className="flex gap-1">
                        {qty > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const result = useConsumable(item.id);
                              toast[result.ok ? 'success' : 'error'](result.message);
                            }}
                          >
                            Use
                          </Button>
                        )}
                        <Button
                          size="sm"
                          disabled={!check.allowed}
                          onClick={() => setPending(item)}
                        >
                          Buy
                        </Button>
                      </div>
                    </div>
                  </div>

                  {!check.allowed && check.reason !== 'already_owned' && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-danger">
                      <ShieldAlert className="size-3" />
                      {check.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Legendary */}
        <TabsContent value="legendary">
          {character.rank_tier < 9 ? (
            <EmptyState
              icon={<Lock className="size-10" />}
              title="Legendary relics are shown to the Wali"
              description="Reach rank 9 and this door opens. Until then, fragments still drop — keep them."
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                Legendary items are cosmetic variants of what you have already earned. They change
                how you look, never how hard you hit.
              </p>
              <div className="space-y-2">
                {LEGENDARY_COSMETICS.map((item) => (
                  <GearCard
                    key={item.id}
                    item={item}
                    owned={ownsItem(inventory, item.id)}
                    isEquipped={equipped[item.slot] === item.id}
                    coins={character.coins}
                    rankTier={character.rank_tier}
                    onBuy={() => setPending(item)}
                    onEquip={() => {
                      equipItem(item.id);
                      toast.success(`${item.name} equipped.`);
                    }}
                  />
                ))}
              </div>
            </>
          )}

          <StarDivider label="Awarded only" className="mt-8" />
          <p className="mb-3 text-center text-xs text-muted">
            These are given to the top warriors each month and never sold. They are permanently
            visible on the winner's profile.
          </p>
          <MonthlyAwardShowcase />
        </TabsContent>
      </Tabs>

      {/* Purchase confirmation */}
      <PurchaseDialog
        item={pending}
        onClose={() => setPending(null)}
        onConfirm={confirmPurchase}
      />
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Gear card                                                           */
/* ------------------------------------------------------------------ */

function GearCard({
  item,
  owned,
  isEquipped,
  coins,
  rankTier,
  onBuy,
  onEquip,
}: {
  item: GearItem;
  owned: boolean;
  isEquipped: boolean;
  coins: number;
  rankTier: number;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const color = RARITY_COLORS[item.rarity];
  const affordable = coins >= item.price;
  const rankOk = rankTier >= item.required_rank;
  const isFoil = item.rarity === 'legendary' || item.rarity === 'mythic';

  return (
    <div
      className={cn('panel p-3 transition-all', isFoil && 'foil-border')}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p
              className={cn('font-display text-sm', isFoil && 'foil')}
              style={!isFoil ? { color } : undefined}
            >
              {item.name}
            </p>
            {item.arabic && <span className="font-arabic text-xs text-muted">{item.arabic}</span>}
            <Badge variant={isFoil ? 'legendary' : 'default'}>{item.rarity}</Badge>
            {isEquipped && <Badge variant="gold">Equipped</Badge>}
          </div>

          <p className="mt-1 text-xs italic text-muted">{item.description}</p>

          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            {item.stats.attack ? <span className="stat-chip">+{item.stats.attack} ATK</span> : null}
            {item.stats.defense ? <span className="stat-chip">+{item.stats.defense} DEF</span> : null}
            {item.stats.hp ? <span className="stat-chip">+{smartNumber(item.stats.hp)} HP</span> : null}
            {item.stats.crit_chance ? (
              <span className="stat-chip">+{formatPercent(item.stats.crit_chance, 1)} crit</span>
            ) : null}
            {item.stats.dodge ? (
              <span className="stat-chip">+{formatPercent(item.stats.dodge)} dodge</span>
            ) : null}
            {item.stats.xp_bonus ? (
              <span className="stat-chip">+{formatPercent(item.stats.xp_bonus)} XP</span>
            ) : null}
            {item.stats.coin_bonus ? (
              <span className="stat-chip">+{formatPercent(item.stats.coin_bonus)} coins</span>
            ) : null}
            {item.stats.all_stats ? (
              <span className="stat-chip">+{item.stats.all_stats} all stats</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {!owned && (
            <span className={cn('tabular text-sm', affordable ? 'text-gold' : 'text-muted/60')}>
              {smartNumber(item.price)}
            </span>
          )}

          {owned ? (
            <Button size="sm" variant={isEquipped ? 'ghost' : 'secondary'} onClick={onEquip} disabled={isEquipped}>
              {isEquipped ? 'Worn' : 'Equip'}
            </Button>
          ) : (
            <Button size="sm" onClick={onBuy} disabled={!affordable || !rankOk}>
              Buy
            </Button>
          )}
        </div>
      </div>

      {!owned && !rankOk && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          <Lock className="size-3" />
          Requires rank tier {item.required_rank}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Purchase dialog                                                     */
/* ------------------------------------------------------------------ */

function PurchaseDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: GearItem | ConsumableItem | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const equipped = useGameStore((s) => s.equipped);
  const character = useGameStore((s) => s.character);

  const deltas = useMemo(() => {
    if (!item || !getGear(item.id)) return [];
    return compareEquip(equipped, item.id);
  }, [item, equipped]);

  if (!item || !character) return null;

  const gear = getGear(item.id);
  const current = gear ? equipped[gear.slot] : undefined;
  const currentItem = current ? getGear(current) : undefined;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>

        {gear && (
          <>
            {currentItem && (
              <p className="mb-2 text-xs text-muted">
                Replaces <span className="text-bone">{currentItem.name}</span> in the{' '}
                {SLOT_LABELS[gear.slot].toLowerCase()} slot.
              </p>
            )}

            {deltas.length > 0 && (
              <div className="rounded-lg border border-edge bg-night/50 p-3">
                <p className="heading-rule mb-2">If you equip this</p>
                <ul className="space-y-1 text-xs">
                  {deltas.map((d) => (
                    <li key={d.label} className="flex items-center justify-between">
                      <span className="text-muted">{d.label}</span>
                      <span className="tabular flex items-center gap-2">
                        <span className="text-muted/60">
                          {d.percent ? formatPercent(d.from, 1) : smartNumber(d.from)}
                        </span>
                        <span className="text-muted/40">→</span>
                        <span
                          className={cn(
                            d.delta > 0 ? 'text-emerald' : d.delta < 0 ? 'text-danger' : 'text-muted',
                          )}
                        >
                          {d.percent ? formatPercent(d.to, 1) : smartNumber(d.to)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="mt-3 flex items-center justify-between rounded-lg border border-edge bg-night/50 p-3">
          <span className="text-sm text-muted">Cost</span>
          <span className="tabular text-lg text-gold">{smartNumber(item.price)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between px-3 text-xs">
          <span className="text-muted">Balance after</span>
          <span className="tabular text-muted">
            {smartNumber(character.coins - item.price)}
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button onClick={onConfirm} disabled={character.coins < item.price}>
            Confirm purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Monthly awards                                                      */
/* ------------------------------------------------------------------ */

function MonthlyAwardShowcase() {
  const inventory = useGameStore((s) => s.inventory);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {['aw_ramadan', 'aw_muharram', 'aw_arafah', 'aw_qadr', 'aw_eid'].map((id) => {
        const item = getGear(id);
        if (!item) return null;
        const owned = ownsItem(inventory, id);

        return (
          <div
            key={id}
            className={cn(
              'panel framed p-3',
              owned ? 'foil-border' : 'opacity-50',
            )}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-legendary" />
              <p className={cn('font-display text-sm', owned ? 'foil' : 'text-muted')}>
                {item.name}
              </p>
            </div>
            {item.arabic && (
              <p className="mt-0.5 font-arabic text-xs text-muted">{item.arabic}</p>
            )}
            <p className="mt-1.5 text-xs text-muted">{item.description}</p>
            {owned && (
              <p className="mt-2 text-[10px] uppercase tracking-widest text-legendary">
                Awarded · {item.awarded_label}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
