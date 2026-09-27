/**
 * The complete gear catalogue: six slots, eight to ten tiers each,
 * plus consumables, legendary cosmetics and the admin-awarded relics.
 */

import type {
  ConsumableItem,
  EquippedMap,
  GearAggregate,
  GearItem,
  GearSlot,
  Rarity,
} from '@/types';

/* ------------------------------------------------------------------ */
/* Swords - attack and crit                                            */
/* ------------------------------------------------------------------ */

export const SWORDS: GearItem[] = [
  { id: 'sw_01', name: 'Rusty Blade', slot: 'sword', tier: 1, rarity: 'common', price: 100, stats: { attack: 2 }, description: 'It has cut nothing yet. Neither have you.', required_rank: 1, is_award_only: false },
  { id: 'sw_02', name: 'Iron Sword', slot: 'sword', tier: 2, rarity: 'common', price: 300, stats: { attack: 5 }, description: 'Honest iron. It does what you tell it.', required_rank: 2, is_award_only: false },
  { id: 'sw_03', name: 'Steel Sword', slot: 'sword', tier: 3, rarity: 'common', price: 700, stats: { attack: 10 }, description: 'Folded steel, balanced for a long road.', required_rank: 2, is_award_only: false },
  { id: 'sw_04', name: 'Damascus Blade', slot: 'sword', tier: 4, rarity: 'rare', price: 1500, stats: { attack: 18 }, description: 'Watered steel. The pattern is the proof.', required_rank: 3, is_award_only: false },
  { id: 'sw_05', name: 'Scimitar of Sabr', arabic: 'سيف الصبر', slot: 'sword', tier: 5, rarity: 'rare', price: 3000, stats: { attack: 30 }, description: 'Curved for patience. It waits, then it lands.', required_rank: 4, is_award_only: false },
  { id: 'sw_06', name: 'Zulfiqar', arabic: 'ذو الفقار', slot: 'sword', tier: 6, rarity: 'epic', price: 6000, stats: { attack: 50, crit_chance: 0.02 }, description: 'Twin-pointed. Named with reverence, carried with humility.', required_rank: 5, is_award_only: false },
  { id: 'sw_07', name: 'Sword of Badr', slot: 'sword', tier: 7, rarity: 'epic', price: 12000, stats: { attack: 80, crit_chance: 0.03 }, description: 'For the outnumbered who stood anyway.', required_rank: 6, is_award_only: false },
  { id: 'sw_08', name: 'Blade of Fajr', slot: 'sword', tier: 8, rarity: 'epic', price: 25000, stats: { attack: 120, crit_chance: 0.05 }, description: 'It is sharpest in the hour before dawn.', required_rank: 7, is_award_only: false },
  { id: 'sw_09', name: 'Saif al-Haqq', arabic: 'سيف الحق', slot: 'sword', tier: 9, rarity: 'legendary', price: 50000, stats: { attack: 200, crit_chance: 0.07 }, description: 'The Sword of Truth. It does not negotiate.', required_rank: 8, is_award_only: false },
  { id: 'sw_10', name: 'Light of the Throne', slot: 'sword', tier: 10, rarity: 'legendary', price: 100000, stats: { attack: 400, crit_chance: 0.1 }, description: 'Carried only by those who walked all 66 zones.', required_rank: 9, is_award_only: false },
];

/* ------------------------------------------------------------------ */
/* Shields - defense and HP                                            */
/* ------------------------------------------------------------------ */

export const SHIELDS: GearItem[] = [
  { id: 'sh_01', name: 'Wooden Shield', slot: 'shield', tier: 1, rarity: 'common', price: 80, stats: { defense: 2 }, description: 'Splintered, but between you and the blow.', required_rank: 1, is_award_only: false },
  { id: 'sh_02', name: 'Iron Buckler', slot: 'shield', tier: 2, rarity: 'common', price: 250, stats: { defense: 5 }, description: 'Small, fast, unglamorous.', required_rank: 2, is_award_only: false },
  { id: 'sh_03', name: 'Knight Shield', slot: 'shield', tier: 3, rarity: 'common', price: 600, stats: { defense: 10, hp: 20 }, description: 'Full-height. You can rest behind it.', required_rank: 2, is_award_only: false },
  { id: 'sh_04', name: 'Wall of Iman', arabic: 'جدار الإيمان', slot: 'shield', tier: 4, rarity: 'rare', price: 1400, stats: { defense: 18, hp: 50 }, description: 'Doubt strikes it and slides off.', required_rank: 3, is_award_only: false },
  { id: 'sh_05', name: 'Shield of Sabr', arabic: 'درع الصبر', slot: 'shield', tier: 5, rarity: 'rare', price: 2800, stats: { defense: 30, hp: 100 }, description: 'It does not block. It endures.', required_rank: 4, is_award_only: false },
  { id: 'sh_06', name: 'Shield of Taqwa', arabic: 'درع التقوى', slot: 'shield', tier: 6, rarity: 'epic', price: 5500, stats: { defense: 50, hp: 200 }, description: 'God-consciousness, worn on the arm.', required_rank: 5, is_award_only: false },
  { id: 'sh_07', name: 'Aegis of Angels', slot: 'shield', tier: 7, rarity: 'epic', price: 11000, stats: { defense: 80, hp: 400 }, description: 'Light held in the shape of a guard.', required_rank: 7, is_award_only: false },
  { id: 'sh_08', name: 'Shield of the Throne', slot: 'shield', tier: 8, rarity: 'legendary', price: 25000, stats: { defense: 130, hp: 800 }, description: 'Nothing in 66 zones has broken it.', required_rank: 8, is_award_only: false },
];

/* ------------------------------------------------------------------ */
/* Armor - HP and defense                                              */
/* ------------------------------------------------------------------ */

export const ARMOR: GearItem[] = [
  { id: 'ar_01', name: 'Cloth Robe', slot: 'armor', tier: 1, rarity: 'common', price: 50, stats: { hp: 10 }, description: 'Plain cloth. Warm, and nothing more.', required_rank: 1, is_award_only: false },
  { id: 'ar_02', name: 'Padded Jerkin', slot: 'armor', tier: 2, rarity: 'common', price: 200, stats: { hp: 40, defense: 2 }, description: 'Quilted layers that take the sting out.', required_rank: 2, is_award_only: false },
  { id: 'ar_03', name: 'Leather Harness', slot: 'armor', tier: 3, rarity: 'common', price: 550, stats: { hp: 100, defense: 5 }, description: 'Cured hide, cut for long marches.', required_rank: 2, is_award_only: false },
  { id: 'ar_04', name: 'Chain Hauberk', slot: 'armor', tier: 4, rarity: 'rare', price: 1300, stats: { hp: 220, defense: 10 }, description: 'A thousand rings, each one closed by hand.', required_rank: 3, is_award_only: false },
  { id: 'ar_05', name: 'Scale of Sabr', slot: 'armor', tier: 5, rarity: 'rare', price: 3200, stats: { hp: 450, defense: 18 }, description: 'Overlapping patience, scale on scale.', required_rank: 4, is_award_only: false },
  { id: 'ar_06', name: 'Plate of the Steadfast', slot: 'armor', tier: 6, rarity: 'epic', price: 7500, stats: { hp: 850, defense: 30 }, description: 'It has been dented everywhere and pierced nowhere.', required_rank: 5, is_award_only: false },
  { id: 'ar_07', name: 'Mail of the Mujahid', slot: 'armor', tier: 7, rarity: 'epic', price: 17000, stats: { hp: 1400, defense: 44 }, description: 'Worn by those who strive and do not boast.', required_rank: 7, is_award_only: false },
  { id: 'ar_08', name: 'Armor of the Righteous', slot: 'armor', tier: 8, rarity: 'legendary', price: 40000, stats: { hp: 2000, defense: 60 }, description: 'The last thing Iblis expects to see standing.', required_rank: 8, is_award_only: false },
];

/* ------------------------------------------------------------------ */
/* Helmets - crit chance and HP                                        */
/* ------------------------------------------------------------------ */

export const HELMETS: GearItem[] = [
  { id: 'he_01', name: 'Leather Cap', slot: 'helmet', tier: 1, rarity: 'common', price: 60, stats: { crit_chance: 0.005 }, description: 'Keeps the sun off. Barely.', required_rank: 1, is_award_only: false },
  { id: 'he_02', name: 'Iron Helm', slot: 'helmet', tier: 2, rarity: 'common', price: 220, stats: { crit_chance: 0.01, hp: 15 }, description: 'Heavy enough to remind you it is there.', required_rank: 2, is_award_only: false },
  { id: 'he_03', name: 'Steel Sallet', slot: 'helmet', tier: 3, rarity: 'common', price: 600, stats: { crit_chance: 0.015, hp: 40 }, description: 'A narrow slit. A narrow focus.', required_rank: 2, is_award_only: false },
  { id: 'he_04', name: 'Helm of Focus', slot: 'helmet', tier: 4, rarity: 'rare', price: 1400, stats: { crit_chance: 0.025, hp: 80 }, description: 'It quiets everything that is not the target.', required_rank: 3, is_award_only: false },
  { id: 'he_05', name: 'Turban of the Scholar', slot: 'helmet', tier: 5, rarity: 'rare', price: 3400, stats: { crit_chance: 0.035, hp: 140 }, description: 'Knowledge finds the weak point faster than force.', required_rank: 4, is_award_only: false },
  { id: 'he_06', name: 'Great Helm of Yaqin', slot: 'helmet', tier: 6, rarity: 'epic', price: 8000, stats: { crit_chance: 0.05, hp: 240 }, description: 'Certainty, welded shut.', required_rank: 5, is_award_only: false },
  { id: 'he_07', name: 'Diadem of the Commander', slot: 'helmet', tier: 7, rarity: 'epic', price: 18000, stats: { crit_chance: 0.065, hp: 360 }, description: 'Men look up when you enter the field.', required_rank: 7, is_award_only: false },
  { id: 'he_08', name: 'Crown of the Khalifa', slot: 'helmet', tier: 8, rarity: 'legendary', price: 35000, stats: { crit_chance: 0.08, hp: 500 }, description: 'Worn by the successor. Heavy by design.', required_rank: 9, is_award_only: false },
];

/* ------------------------------------------------------------------ */
/* Rings - multi-stat                                                  */
/* ------------------------------------------------------------------ */

export const RINGS: GearItem[] = [
  { id: 'ri_01', name: 'Copper Ring', slot: 'ring', tier: 1, rarity: 'common', price: 100, stats: { all_stats: 1 }, description: 'Green at the edges. Still yours.', required_rank: 1, is_award_only: false },
  { id: 'ri_02', name: 'Silver Band', slot: 'ring', tier: 2, rarity: 'common', price: 320, stats: { all_stats: 2 }, description: 'Plain silver, as the Sunnah prefers.', required_rank: 2, is_award_only: false },
  { id: 'ri_03', name: 'Agate Signet', slot: 'ring', tier: 3, rarity: 'common', price: 800, stats: { all_stats: 4, xp_bonus: 0.01 }, description: 'A carved seal. It marks what is yours.', required_rank: 2, is_award_only: false },
  { id: 'ri_04', name: 'Ring of Resolve', slot: 'ring', tier: 4, rarity: 'rare', price: 1900, stats: { all_stats: 6, xp_bonus: 0.015 }, description: 'Tightens when you hesitate.', required_rank: 3, is_award_only: false },
  { id: 'ri_05', name: 'Band of Dhikr', slot: 'ring', tier: 5, rarity: 'rare', price: 4200, stats: { all_stats: 9, xp_bonus: 0.02 }, description: 'Turn it once for every name remembered.', required_rank: 4, is_award_only: false },
  { id: 'ri_06', name: 'Seal of Sulayman', slot: 'ring', tier: 6, rarity: 'epic', price: 9500, stats: { all_stats: 12, xp_bonus: 0.03, coin_bonus: 0.05 }, description: 'Jinn are said to recognise it. They step back.', required_rank: 5, is_award_only: false },
  { id: 'ri_07', name: 'Ring of the Commander', slot: 'ring', tier: 7, rarity: 'epic', price: 21000, stats: { all_stats: 16, xp_bonus: 0.04, coin_bonus: 0.08 }, description: 'Given, never bought. Except here.', required_rank: 7, is_award_only: false },
  { id: 'ri_08', name: 'Ring of the Throne', slot: 'ring', tier: 8, rarity: 'legendary', price: 45000, stats: { all_stats: 20, xp_bonus: 0.05, coin_bonus: 0.12 }, description: 'The last ring on the last hand at the last gate.', required_rank: 8, is_award_only: false },
];

/* ------------------------------------------------------------------ */
/* Boots - dodge and XP                                                */
/* ------------------------------------------------------------------ */

export const BOOTS: GearItem[] = [
  { id: 'bo_01', name: 'Worn Sandals', slot: 'boots', tier: 1, rarity: 'common', price: 70, stats: { dodge: 0.01 }, description: 'They have already walked further than you think.', required_rank: 1, is_award_only: false },
  { id: 'bo_02', name: 'Traveller Boots', slot: 'boots', tier: 2, rarity: 'common', price: 260, stats: { dodge: 0.025 }, description: 'Broken in on the road to nowhere in particular.', required_rank: 2, is_award_only: false },
  { id: 'bo_03', name: 'Hardened Greaves', slot: 'boots', tier: 3, rarity: 'common', price: 650, stats: { dodge: 0.04, hp: 30 }, description: 'Shin and ankle, finally protected.', required_rank: 2, is_award_only: false },
  { id: 'bo_04', name: 'Boots of the Steadfast', slot: 'boots', tier: 4, rarity: 'rare', price: 1600, stats: { dodge: 0.06, xp_bonus: 0.02 }, description: 'They do not step back.', required_rank: 3, is_award_only: false },
  { id: 'bo_05', name: 'Sandals of the Pilgrim', slot: 'boots', tier: 5, rarity: 'rare', price: 3800, stats: { dodge: 0.08, xp_bonus: 0.04 }, description: 'Every mile logged. Every mile counted.', required_rank: 4, is_award_only: false },
  { id: 'bo_06', name: 'Greaves of the Vanguard', slot: 'boots', tier: 6, rarity: 'epic', price: 8800, stats: { dodge: 0.1, xp_bonus: 0.06 }, description: 'First into the line, last out of it.', required_rank: 5, is_award_only: false },
  { id: 'bo_07', name: 'Striders of Fajr', slot: 'boots', tier: 7, rarity: 'epic', price: 19000, stats: { dodge: 0.125, xp_bonus: 0.08 }, description: 'They are already moving when you wake.', required_rank: 7, is_award_only: false },
  { id: 'bo_08', name: 'Boots of the Swift', slot: 'boots', tier: 8, rarity: 'legendary', price: 30000, stats: { dodge: 0.15, xp_bonus: 0.1 }, description: 'Whispers arrive too late to reach you.', required_rank: 8, is_award_only: false },
];

/* ------------------------------------------------------------------ */
/* Legendary cosmetics - unlocked at Wali                              */
/* ------------------------------------------------------------------ */

export const LEGENDARY_COSMETICS: GearItem[] = [
  { id: 'lg_saif_dawn', name: 'Saif al-Haqq — Dawn Skin', slot: 'sword', tier: 9, rarity: 'legendary', price: 60000, stats: { attack: 200, crit_chance: 0.07 }, description: 'The Sword of Truth, rendered in first light.', required_rank: 9, is_award_only: false },
  { id: 'lg_saif_ash', name: 'Saif al-Haqq — Ashfall Skin', slot: 'sword', tier: 9, rarity: 'legendary', price: 60000, stats: { attack: 200, crit_chance: 0.07 }, description: 'The Sword of Truth, carried through the Crypt.', required_rank: 9, is_award_only: false },
  { id: 'lg_cloak_wali', name: 'Cloak of the Wali', slot: 'armor', tier: 9, rarity: 'legendary', price: 75000, stats: { hp: 2200, defense: 62 }, description: 'Plain wool. Nobody who sees it forgets it.', required_rank: 9, is_award_only: false },
  { id: 'lg_crown_khalifa', name: 'Crown of the Khalifa — Radiant', slot: 'helmet', tier: 9, rarity: 'legendary', price: 80000, stats: { crit_chance: 0.085, hp: 560 }, description: 'Pure gold radiance. Earned, then worn quietly.', required_rank: 10, is_award_only: false },
];

/* ------------------------------------------------------------------ */
/* Monthly admin awards - never re-released                            */
/* ------------------------------------------------------------------ */

export const MONTHLY_AWARDS: GearItem[] = [
  { id: 'aw_ramadan', name: 'Sword of Ramadan', arabic: 'سيف رمضان', slot: 'sword', tier: 11, rarity: 'mythic', price: 0, stats: { attack: 260, crit_chance: 0.08 }, description: 'Awarded to the ten who fought hardest in the month of fasting.', required_rank: 1, is_award_only: true, awarded_label: 'Ramadan' },
  { id: 'aw_muharram', name: 'Blade of Muharram', slot: 'sword', tier: 11, rarity: 'mythic', price: 0, stats: { attack: 240, crit_chance: 0.07 }, description: 'For the first month, and the first to rise in it.', required_rank: 1, is_award_only: true, awarded_label: 'Muharram' },
  { id: 'aw_arafah', name: 'Shield of Arafah', slot: 'shield', tier: 11, rarity: 'mythic', price: 0, stats: { defense: 150, hp: 900 }, description: 'For standing when standing was the whole point.', required_rank: 1, is_award_only: true, awarded_label: 'Arafah' },
  { id: 'aw_qadr', name: 'Ring of Laylat al-Qadr', slot: 'ring', tier: 11, rarity: 'mythic', price: 0, stats: { all_stats: 27, xp_bonus: 0.07, coin_bonus: 0.15 }, description: 'Better than a thousand months.', required_rank: 1, is_award_only: true, awarded_label: 'Laylat al-Qadr' },
  { id: 'aw_eid', name: 'Crown of Eid', slot: 'helmet', tier: 11, rarity: 'mythic', price: 0, stats: { crit_chance: 0.09, hp: 620 }, description: 'Worn once a year, remembered all of it.', required_rank: 1, is_award_only: true, awarded_label: 'Eid' },
];

/* ------------------------------------------------------------------ */
/* Consumables                                                         */
/* ------------------------------------------------------------------ */

export const CONSUMABLES: ConsumableItem[] = [
  { id: 'cn_freeze', name: 'Streak Freeze', price: 500, effect: 'streak_freeze', magnitude: 1, duration_hours: 0, description: 'Protects one missed day. Your streak survives.', required_rank: 4 },
  { id: 'cn_potion', name: 'Health Potion', price: 300, effect: 'heal_percent', magnitude: 0.5, duration_hours: 0, description: 'Restores 50% of your maximum HP instantly.', required_rank: 2 },
  { id: 'cn_restore', name: 'Full Restore', price: 1000, effect: 'heal_full', magnitude: 1, duration_hours: 0, description: 'Back to full. Back to the fight.', required_rank: 2 },
  { id: 'cn_xp2', name: 'XP Boost 2x (1 day)', price: 1000, effect: 'xp_boost', magnitude: 2, duration_hours: 24, description: 'Double XP from every source for 24 hours.', required_rank: 2 },
  { id: 'cn_xp3', name: 'XP Boost 3x (1 day)', price: 3000, effect: 'xp_boost', magnitude: 3, duration_hours: 24, description: 'Triple XP from every source for 24 hours.', required_rank: 2 },
  { id: 'cn_reroll', name: 'Reroll Monster', price: 200, effect: 'reroll_monster', magnitude: 1, duration_hours: 0, description: 'Swap the current encounter for another at the same position.', required_rank: 2 },
  { id: 'cn_morale', name: 'Morale Scroll +20%', price: 400, effect: 'morale', magnitude: 0.2, duration_hours: 24, description: '+20% attack for 24 hours. Read it aloud.', required_rank: 2 },
  { id: 'cn_combo', name: 'Combo Charm', price: 800, effect: 'combo_charm', magnitude: 5, duration_hours: 0, description: 'Your next 5 habits chain the combo and pierce defense.', required_rank: 3 },
  { id: 'cn_luck', name: 'Loot Luck Charm', price: 1200, effect: 'loot_luck', magnitude: 2, duration_hours: 0, description: 'Your next kill rolls the loot table twice.', required_rank: 3 },
];

/* ------------------------------------------------------------------ */
/* Catalogue access                                                    */
/* ------------------------------------------------------------------ */

export const ALL_GEAR: GearItem[] = [
  ...SWORDS,
  ...SHIELDS,
  ...ARMOR,
  ...HELMETS,
  ...RINGS,
  ...BOOTS,
  ...LEGENDARY_COSMETICS,
  ...MONTHLY_AWARDS,
];

const GEAR_BY_ID = new Map<string, GearItem>(ALL_GEAR.map((g) => [g.id, g]));
const CONSUMABLE_BY_ID = new Map<string, ConsumableItem>(CONSUMABLES.map((c) => [c.id, c]));

export function getGear(id: string): GearItem | undefined {
  return GEAR_BY_ID.get(id);
}

export function getConsumable(id: string): ConsumableItem | undefined {
  return CONSUMABLE_BY_ID.get(id);
}

export function isConsumable(id: string): boolean {
  return CONSUMABLE_BY_ID.has(id);
}

export function gearForSlot(slot: GearSlot): GearItem[] {
  return ALL_GEAR.filter((g) => g.slot === slot && !g.is_award_only && g.tier <= 8);
}

export function purchasableLegendaries(): GearItem[] {
  return LEGENDARY_COSMETICS;
}

/** Loot-eligible gear for a zone: tier scales with depth along the road. */
export function lootPoolForZone(zoneId: number, rarity: Rarity): GearItem[] {
  const maxTier = Math.min(8, Math.max(1, Math.ceil(zoneId / 8)));
  return ALL_GEAR.filter(
    (g) => !g.is_award_only && g.tier <= maxTier + 1 && g.rarity === rarity,
  );
}

/* ------------------------------------------------------------------ */
/* Aggregation                                                         */
/* ------------------------------------------------------------------ */

export const ZERO_AGGREGATE: GearAggregate = {
  attack: 0,
  defense: 0,
  hp: 0,
  crit_chance: 0,
  crit_multiplier: 0,
  dodge: 0,
  xp_bonus: 0,
  coin_bonus: 0,
  all_stats: 0,
};

/** Sum every equipped item into one bonus block. */
export function aggregateEquipped(equipped: EquippedMap): GearAggregate {
  const total: GearAggregate = { ...ZERO_AGGREGATE };

  (Object.keys(equipped) as GearSlot[]).forEach((slot) => {
    const id = equipped[slot];
    if (!id) return;
    const item = getGear(id);
    if (!item) return;

    total.attack += item.stats.attack ?? 0;
    total.defense += item.stats.defense ?? 0;
    total.hp += item.stats.hp ?? 0;
    total.crit_chance += item.stats.crit_chance ?? 0;
    total.crit_multiplier += item.stats.crit_multiplier ?? 0;
    total.dodge += item.stats.dodge ?? 0;
    total.xp_bonus += item.stats.xp_bonus ?? 0;
    total.coin_bonus += item.stats.coin_bonus ?? 0;
    total.all_stats += item.stats.all_stats ?? 0;
  });

  return total;
}

export const GEAR_SLOTS: GearSlot[] = ['sword', 'shield', 'armor', 'helmet', 'ring', 'boots'];

export const SLOT_LABELS: Record<GearSlot, string> = {
  sword: 'Sword',
  shield: 'Shield',
  armor: 'Armor',
  helmet: 'Helmet',
  ring: 'Ring',
  boots: 'Boots',
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#FBBF24',
  mythic: '#EC4899',
};
