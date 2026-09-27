-- =====================================================================
-- STEP 4 of 4 - ranks, taunts, gear, achievements, seasons
-- REQUIRED. The rank and taunt functions read these tables.
-- =====================================================================
-- =====================================================================
-- ISLAM WARRIOR — seed data
-- 0004: GENERATED FILE — do not edit by hand.
--
-- Regenerate with:  npm run seed
-- Source of truth:  src/game/**
-- Generated:        2026-09-24T20:38:47.802Z
-- =====================================================================

begin;

-- Gear catalogue --------------------------------------------------

insert into public.gear_items ("id", "name", "arabic", "slot", "tier", "rarity", "price", "stats", "description", "required_rank", "is_award_only", "awarded_label") values
  ('sw_01', 'Rusty Blade', null, 'sword', 1, 'common', 100, '{"attack":2}'::jsonb, 'It has cut nothing yet. Neither have you.', 1, false, null),
  ('sw_02', 'Iron Sword', null, 'sword', 2, 'common', 300, '{"attack":5}'::jsonb, 'Honest iron. It does what you tell it.', 2, false, null),
  ('sw_03', 'Steel Sword', null, 'sword', 3, 'common', 700, '{"attack":10}'::jsonb, 'Folded steel, balanced for a long road.', 2, false, null),
  ('sw_04', 'Damascus Blade', null, 'sword', 4, 'rare', 1500, '{"attack":18}'::jsonb, 'Watered steel. The pattern is the proof.', 3, false, null),
  ('sw_05', 'Scimitar of Sabr', 'سيف الصبر', 'sword', 5, 'rare', 3000, '{"attack":30}'::jsonb, 'Curved for patience. It waits, then it lands.', 4, false, null),
  ('sw_06', 'Zulfiqar', 'ذو الفقار', 'sword', 6, 'epic', 6000, '{"attack":50,"crit_chance":0.02}'::jsonb, 'Twin-pointed. Named with reverence, carried with humility.', 5, false, null),
  ('sw_07', 'Sword of Badr', null, 'sword', 7, 'epic', 12000, '{"attack":80,"crit_chance":0.03}'::jsonb, 'For the outnumbered who stood anyway.', 6, false, null),
  ('sw_08', 'Blade of Fajr', null, 'sword', 8, 'epic', 25000, '{"attack":120,"crit_chance":0.05}'::jsonb, 'It is sharpest in the hour before dawn.', 7, false, null),
  ('sw_09', 'Saif al-Haqq', 'سيف الحق', 'sword', 9, 'legendary', 50000, '{"attack":200,"crit_chance":0.07}'::jsonb, 'The Sword of Truth. It does not negotiate.', 8, false, null),
  ('sw_10', 'Light of the Throne', null, 'sword', 10, 'legendary', 100000, '{"attack":400,"crit_chance":0.1}'::jsonb, 'Carried only by those who walked all 66 zones.', 9, false, null),
  ('sh_01', 'Wooden Shield', null, 'shield', 1, 'common', 80, '{"defense":2}'::jsonb, 'Splintered, but between you and the blow.', 1, false, null),
  ('sh_02', 'Iron Buckler', null, 'shield', 2, 'common', 250, '{"defense":5}'::jsonb, 'Small, fast, unglamorous.', 2, false, null),
  ('sh_03', 'Knight Shield', null, 'shield', 3, 'common', 600, '{"defense":10,"hp":20}'::jsonb, 'Full-height. You can rest behind it.', 2, false, null),
  ('sh_04', 'Wall of Iman', 'جدار الإيمان', 'shield', 4, 'rare', 1400, '{"defense":18,"hp":50}'::jsonb, 'Doubt strikes it and slides off.', 3, false, null),
  ('sh_05', 'Shield of Sabr', 'درع الصبر', 'shield', 5, 'rare', 2800, '{"defense":30,"hp":100}'::jsonb, 'It does not block. It endures.', 4, false, null),
  ('sh_06', 'Shield of Taqwa', 'درع التقوى', 'shield', 6, 'epic', 5500, '{"defense":50,"hp":200}'::jsonb, 'God-consciousness, worn on the arm.', 5, false, null),
  ('sh_07', 'Aegis of Angels', null, 'shield', 7, 'epic', 11000, '{"defense":80,"hp":400}'::jsonb, 'Light held in the shape of a guard.', 7, false, null),
  ('sh_08', 'Shield of the Throne', null, 'shield', 8, 'legendary', 25000, '{"defense":130,"hp":800}'::jsonb, 'Nothing in 66 zones has broken it.', 8, false, null),
  ('ar_01', 'Cloth Robe', null, 'armor', 1, 'common', 50, '{"hp":10}'::jsonb, 'Plain cloth. Warm, and nothing more.', 1, false, null),
  ('ar_02', 'Padded Jerkin', null, 'armor', 2, 'common', 200, '{"hp":40,"defense":2}'::jsonb, 'Quilted layers that take the sting out.', 2, false, null),
  ('ar_03', 'Leather Harness', null, 'armor', 3, 'common', 550, '{"hp":100,"defense":5}'::jsonb, 'Cured hide, cut for long marches.', 2, false, null),
  ('ar_04', 'Chain Hauberk', null, 'armor', 4, 'rare', 1300, '{"hp":220,"defense":10}'::jsonb, 'A thousand rings, each one closed by hand.', 3, false, null),
  ('ar_05', 'Scale of Sabr', null, 'armor', 5, 'rare', 3200, '{"hp":450,"defense":18}'::jsonb, 'Overlapping patience, scale on scale.', 4, false, null),
  ('ar_06', 'Plate of the Steadfast', null, 'armor', 6, 'epic', 7500, '{"hp":850,"defense":30}'::jsonb, 'It has been dented everywhere and pierced nowhere.', 5, false, null),
  ('ar_07', 'Mail of the Mujahid', null, 'armor', 7, 'epic', 17000, '{"hp":1400,"defense":44}'::jsonb, 'Worn by those who strive and do not boast.', 7, false, null),
  ('ar_08', 'Armor of the Righteous', null, 'armor', 8, 'legendary', 40000, '{"hp":2000,"defense":60}'::jsonb, 'The last thing Iblis expects to see standing.', 8, false, null),
  ('he_01', 'Leather Cap', null, 'helmet', 1, 'common', 60, '{"crit_chance":0.005}'::jsonb, 'Keeps the sun off. Barely.', 1, false, null),
  ('he_02', 'Iron Helm', null, 'helmet', 2, 'common', 220, '{"crit_chance":0.01,"hp":15}'::jsonb, 'Heavy enough to remind you it is there.', 2, false, null),
  ('he_03', 'Steel Sallet', null, 'helmet', 3, 'common', 600, '{"crit_chance":0.015,"hp":40}'::jsonb, 'A narrow slit. A narrow focus.', 2, false, null),
  ('he_04', 'Helm of Focus', null, 'helmet', 4, 'rare', 1400, '{"crit_chance":0.025,"hp":80}'::jsonb, 'It quiets everything that is not the target.', 3, false, null),
  ('he_05', 'Turban of the Scholar', null, 'helmet', 5, 'rare', 3400, '{"crit_chance":0.035,"hp":140}'::jsonb, 'Knowledge finds the weak point faster than force.', 4, false, null),
  ('he_06', 'Great Helm of Yaqin', null, 'helmet', 6, 'epic', 8000, '{"crit_chance":0.05,"hp":240}'::jsonb, 'Certainty, welded shut.', 5, false, null),
  ('he_07', 'Diadem of the Commander', null, 'helmet', 7, 'epic', 18000, '{"crit_chance":0.065,"hp":360}'::jsonb, 'Men look up when you enter the field.', 7, false, null),
  ('he_08', 'Crown of the Khalifa', null, 'helmet', 8, 'legendary', 35000, '{"crit_chance":0.08,"hp":500}'::jsonb, 'Worn by the successor. Heavy by design.', 9, false, null),
  ('ri_01', 'Copper Ring', null, 'ring', 1, 'common', 100, '{"all_stats":1}'::jsonb, 'Green at the edges. Still yours.', 1, false, null),
  ('ri_02', 'Silver Band', null, 'ring', 2, 'common', 320, '{"all_stats":2}'::jsonb, 'Plain silver, as the Sunnah prefers.', 2, false, null),
  ('ri_03', 'Agate Signet', null, 'ring', 3, 'common', 800, '{"all_stats":4,"xp_bonus":0.01}'::jsonb, 'A carved seal. It marks what is yours.', 2, false, null),
  ('ri_04', 'Ring of Resolve', null, 'ring', 4, 'rare', 1900, '{"all_stats":6,"xp_bonus":0.015}'::jsonb, 'Tightens when you hesitate.', 3, false, null),
  ('ri_05', 'Band of Dhikr', null, 'ring', 5, 'rare', 4200, '{"all_stats":9,"xp_bonus":0.02}'::jsonb, 'Turn it once for every name remembered.', 4, false, null),
  ('ri_06', 'Seal of Sulayman', null, 'ring', 6, 'epic', 9500, '{"all_stats":12,"xp_bonus":0.03,"coin_bonus":0.05}'::jsonb, 'Jinn are said to recognise it. They step back.', 5, false, null),
  ('ri_07', 'Ring of the Commander', null, 'ring', 7, 'epic', 21000, '{"all_stats":16,"xp_bonus":0.04,"coin_bonus":0.08}'::jsonb, 'Given, never bought. Except here.', 7, false, null),
  ('ri_08', 'Ring of the Throne', null, 'ring', 8, 'legendary', 45000, '{"all_stats":20,"xp_bonus":0.05,"coin_bonus":0.12}'::jsonb, 'The last ring on the last hand at the last gate.', 8, false, null),
  ('bo_01', 'Worn Sandals', null, 'boots', 1, 'common', 70, '{"dodge":0.01}'::jsonb, 'They have already walked further than you think.', 1, false, null),
  ('bo_02', 'Traveller Boots', null, 'boots', 2, 'common', 260, '{"dodge":0.025}'::jsonb, 'Broken in on the road to nowhere in particular.', 2, false, null),
  ('bo_03', 'Hardened Greaves', null, 'boots', 3, 'common', 650, '{"dodge":0.04,"hp":30}'::jsonb, 'Shin and ankle, finally protected.', 2, false, null),
  ('bo_04', 'Boots of the Steadfast', null, 'boots', 4, 'rare', 1600, '{"dodge":0.06,"xp_bonus":0.02}'::jsonb, 'They do not step back.', 3, false, null),
  ('bo_05', 'Sandals of the Pilgrim', null, 'boots', 5, 'rare', 3800, '{"dodge":0.08,"xp_bonus":0.04}'::jsonb, 'Every mile logged. Every mile counted.', 4, false, null),
  ('bo_06', 'Greaves of the Vanguard', null, 'boots', 6, 'epic', 8800, '{"dodge":0.1,"xp_bonus":0.06}'::jsonb, 'First into the line, last out of it.', 5, false, null),
  ('bo_07', 'Striders of Fajr', null, 'boots', 7, 'epic', 19000, '{"dodge":0.125,"xp_bonus":0.08}'::jsonb, 'They are already moving when you wake.', 7, false, null),
  ('bo_08', 'Boots of the Swift', null, 'boots', 8, 'legendary', 30000, '{"dodge":0.15,"xp_bonus":0.1}'::jsonb, 'Whispers arrive too late to reach you.', 8, false, null),
  ('lg_saif_dawn', 'Saif al-Haqq — Dawn Skin', null, 'sword', 9, 'legendary', 60000, '{"attack":200,"crit_chance":0.07}'::jsonb, 'The Sword of Truth, rendered in first light.', 9, false, null),
  ('lg_saif_ash', 'Saif al-Haqq — Ashfall Skin', null, 'sword', 9, 'legendary', 60000, '{"attack":200,"crit_chance":0.07}'::jsonb, 'The Sword of Truth, carried through the Crypt.', 9, false, null),
  ('lg_cloak_wali', 'Cloak of the Wali', null, 'armor', 9, 'legendary', 75000, '{"hp":2200,"defense":62}'::jsonb, 'Plain wool. Nobody who sees it forgets it.', 9, false, null),
  ('lg_crown_khalifa', 'Crown of the Khalifa — Radiant', null, 'helmet', 9, 'legendary', 80000, '{"crit_chance":0.085,"hp":560}'::jsonb, 'Pure gold radiance. Earned, then worn quietly.', 10, false, null),
  ('aw_ramadan', 'Sword of Ramadan', 'سيف رمضان', 'sword', 11, 'mythic', 0, '{"attack":260,"crit_chance":0.08}'::jsonb, 'Awarded to the ten who fought hardest in the month of fasting.', 1, true, 'Ramadan'),
  ('aw_muharram', 'Blade of Muharram', null, 'sword', 11, 'mythic', 0, '{"attack":240,"crit_chance":0.07}'::jsonb, 'For the first month, and the first to rise in it.', 1, true, 'Muharram'),
  ('aw_arafah', 'Shield of Arafah', null, 'shield', 11, 'mythic', 0, '{"defense":150,"hp":900}'::jsonb, 'For standing when standing was the whole point.', 1, true, 'Arafah'),
  ('aw_qadr', 'Ring of Laylat al-Qadr', null, 'ring', 11, 'mythic', 0, '{"all_stats":27,"xp_bonus":0.07,"coin_bonus":0.15}'::jsonb, 'Better than a thousand months.', 1, true, 'Laylat al-Qadr'),
  ('aw_eid', 'Crown of Eid', null, 'helmet', 11, 'mythic', 0, '{"crit_chance":0.09,"hp":620}'::jsonb, 'Worn once a year, remembered all of it.', 1, true, 'Eid')
on conflict ("id") do update set
  "name" = excluded."name",
  "arabic" = excluded."arabic",
  "slot" = excluded."slot",
  "tier" = excluded."tier",
  "rarity" = excluded."rarity",
  "price" = excluded."price",
  "stats" = excluded."stats",
  "description" = excluded."description",
  "required_rank" = excluded."required_rank",
  "is_award_only" = excluded."is_award_only",
  "awarded_label" = excluded."awarded_label"
;

-- Consumables ------------------------------------------------------

insert into public.consumable_items ("id", "name", "price", "effect", "magnitude", "duration_hours", "description", "required_rank") values
  ('cn_freeze', 'Streak Freeze', 500, 'streak_freeze', 1, 0, 'Protects one missed day. Your streak survives.', 4),
  ('cn_potion', 'Health Potion', 300, 'heal_percent', 0.5, 0, 'Restores 50% of your maximum HP instantly.', 2),
  ('cn_restore', 'Full Restore', 1000, 'heal_full', 1, 0, 'Back to full. Back to the fight.', 2),
  ('cn_xp2', 'XP Boost 2x (1 day)', 1000, 'xp_boost', 2, 24, 'Double XP from every source for 24 hours.', 2),
  ('cn_xp3', 'XP Boost 3x (1 day)', 3000, 'xp_boost', 3, 24, 'Triple XP from every source for 24 hours.', 2),
  ('cn_reroll', 'Reroll Monster', 200, 'reroll_monster', 1, 0, 'Swap the current encounter for another at the same position.', 2),
  ('cn_morale', 'Morale Scroll +20%', 400, 'morale', 0.2, 24, '+20% attack for 24 hours. Read it aloud.', 2),
  ('cn_combo', 'Combo Charm', 800, 'combo_charm', 5, 0, 'Your next 5 habits chain the combo and pierce defense.', 3),
  ('cn_luck', 'Loot Luck Charm', 1200, 'loot_luck', 2, 0, 'Your next kill rolls the loot table twice.', 3)
on conflict ("id") do update set
  "name" = excluded."name",
  "price" = excluded."price",
  "effect" = excluded."effect",
  "magnitude" = excluded."magnitude",
  "duration_hours" = excluded."duration_hours",
  "description" = excluded."description",
  "required_rank" = excluded."required_rank"
;

-- Ten ranks --------------------------------------------------------

insert into public.ranks ("tier", "name", "arabic", "english", "color", "accent", "xp_required", "multiplier", "max_habits", "unlocks") values
  (1, 'Muhajir', 'المهاجر', 'The Migrant', '#6B7280', null, 0, 1, 999, array['The road begins', 'Unlimited habits, from day one']),
  (2, 'Talib', 'الطالب', 'The Seeker', '#92400E', null, 500, 1.05, 999, array['Shop access', 'Consumables unlocked']),
  (3, 'Mujahid', 'المجاهد', 'The Striver', '#9CA3AF', null, 2000, 1.1, 999, array['Guilds unlocked', 'Combo Charm and Loot Luck']),
  (4, 'Sabir', 'الصابر', 'The Patient', '#10B981', null, 6000, 1.15, 999, array['Streak Freeze unlocked']),
  (5, 'Muqatil', 'المقاتل', 'The Fighter', '#3B82F6', null, 15000, 1.2, 999, array['1v1 duels']),
  (6, 'Farsan', 'الفارس', 'The Knight', '#D4AF37', null, 35000, 1.3, 999, array['Tournaments']),
  (7, 'Qa''id', 'القائد', 'The Commander', '#E5E7EB', null, 75000, 1.4, 999, array['Create a guild']),
  (8, 'Sultan al-Nafs', 'سلطان النفس', 'King of the Self', '#1F2937', '#D4AF37', 150000, 1.55, 999, array['Custom title']),
  (9, 'Wali', 'الولي', 'The Saint', '#F9FAFB', '#D4AF37', 300000, 1.7, 999, array['Legendary shop tier']),
  (10, 'Khalifa', 'الخليفة', 'The Successor', '#FBBF24', '#FBBF24', 600000, 2, 999, array['Hall of Legends'])
on conflict ("tier") do update set
  "name" = excluded."name",
  "arabic" = excluded."arabic",
  "english" = excluded."english",
  "color" = excluded."color",
  "accent" = excluded."accent",
  "xp_required" = excluded."xp_required",
  "multiplier" = excluded."multiplier",
  "max_habits" = excluded."max_habits",
  "unlocks" = excluded."unlocks"
;

-- 60 taunts --------------------------------------------------------

insert into public.iblis_taunts ("id", "text") values
  (1, 'You think your little streak impresses me? I''ve broken men far stronger.'),
  (2, 'I was there when your father was weak. You are no different.'),
  (3, 'Give up. Your habits mean nothing. You know it.'),
  (4, 'You missed Fajr yesterday. Already losing.'),
  (5, 'Look at your leaderboard. Everyone is ahead.'),
  (6, 'One day you''ll slip. And I will be waiting.'),
  (7, 'Your Quran recitation is hollow. I hear no heart.'),
  (8, 'I see you skip workouts. I see everything.'),
  (9, 'Why try? The road is too long for you.'),
  (10, 'You''ll be back to your old self in a week. I promise.'),
  (11, 'Your friends gave up too. So will you.'),
  (12, 'You''re only doing this for show. I know your heart.'),
  (13, 'That streak? It''s fear, not discipline.'),
  (14, 'You pray fast. I count the seconds.'),
  (15, 'You think Allah hears you? Prove it.'),
  (16, 'The road to my throne is paved with men like you.'),
  (17, 'Every zone you enter, I''ve already poisoned.'),
  (18, 'You''re not a warrior. You''re a boy with a sword.'),
  (19, 'I don''t even need to fight you. Time will.'),
  (20, 'You started this for likes. Not for Him.'),
  (21, 'Look how tired you are. Rest. Just one day.'),
  (22, 'Your habits are chains I made to keep you busy.'),
  (23, 'You''ll never reach Zone 66. Nobody has.'),
  (24, 'I have whispered to kings. You are nothing.'),
  (25, 'You think I fear your little app? I built your excuses.'),
  (26, 'One missed day becomes two. I know the pattern.'),
  (27, 'Your family doesn''t see your effort. I do. And I laugh.'),
  (28, 'You measure your faith in pixels and streaks.'),
  (29, 'Come back to me. I kept your old habits warm.'),
  (30, 'You were happier before you started. Admit it.'),
  (31, 'I don''t need to defeat you. I just need to wait.'),
  (32, 'Your dua yesterday? I made sure you doubted it.'),
  (33, 'The Prophet ﷺ had companions. You have an app.'),
  (34, 'You think this is jihad? This is a game.'),
  (35, 'I''ve watched you fail a thousand times in my mind.'),
  (36, 'Your shield is cardboard. Your sword is rust.'),
  (37, 'When you fall — and you will — I''ll be right here.'),
  (38, 'You call on Allah. He has not answered yet.'),
  (39, 'Your ancestors fought with steel. You fight with taps.'),
  (40, 'Every habit you complete, I plant a doubt.'),
  (41, 'You''re not becoming stronger. You''re becoming tired.'),
  (42, 'The road does not end. That is the trick.'),
  (43, 'You''re only 1% of the way. Look up. See the mountain.'),
  (44, 'You celebrate small wins. I celebrate your pride.'),
  (45, 'The strongest men I broke on Zone 5.'),
  (46, 'You cannot defeat me. You can only delay.'),
  (47, 'I know the exact day you''ll quit. I''ve circled it.'),
  (48, 'Your streak is your god now. Not Him.'),
  (49, 'You will not finish. You were never going to.'),
  (50, 'You talk to me in the app. You''re already mine.'),
  (51, 'You fear me more than you love Him. I can tell.'),
  (52, 'Every level up is a step toward your fall.'),
  (53, 'I don''t need soldiers. I need your attention.'),
  (54, 'You will reach my throne a hollow man.'),
  (55, 'Your habits are for you. Not for Him. I know.'),
  (56, 'I was there when you first promised. I remember.'),
  (57, 'Your parents pray you return to who you were.'),
  (58, 'You are only doing this to prove me wrong. And you will fail.'),
  (59, 'Look behind you. No one is following you here.'),
  (60, 'At the Throne, you will kneel. Everyone kneels.')
on conflict ("id") do update set
  "text" = excluded."text"
;

-- 10 replies -------------------------------------------------------

insert into public.iblis_replies ("id", "text", "morale_percent") values
  (1, 'I haven''t even started.', 0.1),
  (2, 'Watch me.', 0.1),
  (3, 'Allah is with me — you are nothing.', 0.1),
  (4, 'Keep talking. I''m coming for you.', 0.1),
  (5, 'You fear me — that''s why you talk.', 0.1),
  (6, 'This is only round one.', 0.1),
  (7, 'I will bury you at Zone 66.', 0.1),
  (8, 'Your whispers bounce off my shield.', 0.1),
  (9, 'I fight for something greater than myself.', 0.1),
  (10, 'See you at the Throne.', 0.1)
on conflict ("id") do update set
  "text" = excluded."text",
  "morale_percent" = excluded."morale_percent"
;

-- Achievements -----------------------------------------------------

insert into public.achievements ("id", "name", "description", "category", "rarity", "secret", "target", "reward_coins", "season_id") values
  ('ach_streak_7', 'Seven Dawns', 'Hold a 7-day streak.', 'streak', 'common', false, 7, 250, null),
  ('ach_streak_30', 'The Steadfast', 'Hold a 30-day streak.', 'streak', 'rare', false, 30, 1500, null),
  ('ach_streak_100', 'The Unbroken', 'Hold a 100-day streak.', 'streak', 'epic', false, 100, 7500, null),
  ('ach_streak_365', 'Year of Iron', 'Hold a 365-day streak.', 'streak', 'legendary', false, 365, 50000, null),
  ('ach_kills_10', 'First Blood', 'Defeat 10 monsters.', 'kills', 'common', false, 10, 150, null),
  ('ach_kills_100', 'Hundred Fallen', 'Defeat 100 monsters.', 'kills', 'rare', false, 100, 1200, null),
  ('ach_kills_1000', 'Slayer of a Thousand', 'Defeat 1,000 monsters.', 'kills', 'epic', false, 1000, 10000, null),
  ('ach_kills_10000', 'The Reaper of Zones', 'Defeat 10,000 monsters.', 'kills', 'mythic', false, 10000, 100000, null),
  ('ach_zone_1', 'Out of the Slums', 'Clear Zone 1.', 'zones', 'common', false, 1, 200, null),
  ('ach_zone_10', 'Past the Library', 'Clear Zone 10.', 'zones', 'rare', false, 10, 2000, null),
  ('ach_zone_30', 'Walker of the Deep Road', 'Clear Zone 30.', 'zones', 'epic', false, 30, 12000, null),
  ('ach_zone_50', 'Through the Fitnah', 'Clear Zone 50.', 'zones', 'legendary', false, 50, 40000, null),
  ('ach_zone_66', 'He Who Stood at the Throne', 'Defeat Iblis.', 'zones', 'mythic', false, 66, 250000, null),
  ('ach_rank_2', 'The Seeker', 'Reach the rank of Talib.', 'rank', 'common', false, 2, 200, null),
  ('ach_rank_3', 'The Striver', 'Reach the rank of Mujahid.', 'rank', 'common', false, 3, 400, null),
  ('ach_rank_4', 'The Patient', 'Reach the rank of Sabir.', 'rank', 'rare', false, 4, 800, null),
  ('ach_rank_5', 'The Fighter', 'Reach the rank of Muqatil.', 'rank', 'rare', false, 5, 1600, null),
  ('ach_rank_6', 'The Knight', 'Reach the rank of Farsan.', 'rank', 'epic', false, 6, 3200, null),
  ('ach_rank_7', 'The Commander', 'Reach the rank of Qa''id.', 'rank', 'epic', false, 7, 6400, null),
  ('ach_rank_8', 'King of the Self', 'Reach the rank of Sultan al-Nafs.', 'rank', 'legendary', false, 8, 15000, null),
  ('ach_rank_9', 'The Saint', 'Reach the rank of Wali.', 'rank', 'legendary', false, 9, 35000, null),
  ('ach_rank_10', 'The Successor', 'Reach the rank of Khalifa.', 'rank', 'mythic', false, 10, 100000, null),
  ('ach_coins_1k', 'First Purse', 'Earn 1,000 coins in total.', 'coins', 'common', false, 1000, 100, null),
  ('ach_coins_10k', 'Merchant of the Road', 'Earn 10,000 coins in total.', 'coins', 'rare', false, 10000, 1000, null),
  ('ach_coins_100k', 'Treasury of One', 'Earn 100,000 coins in total.', 'coins', 'epic', false, 100000, 10000, null),
  ('ach_coins_1m', 'The Unspent Fortune', 'Earn 1,000,000 coins in total.', 'coins', 'legendary', false, 1000000, 75000, null),
  ('ach_perfect_week', 'A Week Without Gaps', 'Complete every scheduled habit for a full week.', 'perfect', 'rare', false, 1, 1000, null),
  ('ach_perfect_week_4', 'Four Clean Weeks', 'Record four perfect weeks.', 'perfect', 'epic', false, 4, 5000, null),
  ('ach_perfect_month', 'A Month Without Gaps', 'Complete every scheduled habit for a full month.', 'perfect', 'legendary', false, 1, 20000, null),
  ('ach_resist_7', 'Shield of Purity', 'Resist a bad habit 7 days running.', 'resistance', 'common', false, 7, 500, null),
  ('ach_resist_30', 'Chains Broken', 'Resist a bad habit 30 days running.', 'resistance', 'rare', false, 30, 3000, null),
  ('ach_resist_90', 'The Purified', 'Resist a bad habit 90 days running.', 'resistance', 'epic', false, 90, 15000, null),
  ('ach_resist_365', 'A Year of Restraint', 'Resist a bad habit 365 days running.', 'resistance', 'mythic', false, 365, 120000, null),
  ('ach_guild_join', 'Brotherhood', 'Join a guild.', 'guild', 'common', false, 1, 200, null),
  ('ach_guild_10k', 'Pillar of the Guild', 'Contribute 10,000 XP to your guild.', 'guild', 'rare', false, 10000, 2500, null),
  ('ach_guild_100k', 'Backbone', 'Contribute 100,000 XP to your guild.', 'guild', 'epic', false, 100000, 20000, null),
  ('ach_iblis_1', 'First Words', 'Answer Iblis once.', 'iblis', 'common', false, 1, 300, null),
  ('ach_iblis_10', 'Unshaken', 'Answer Iblis ten times.', 'iblis', 'rare', false, 10, 3000, null),
  ('ach_iblis_50', 'The Defiant', 'Answer Iblis fifty times.', 'iblis', 'legendary', false, 50, 30000, null),
  ('ach_secret_fajr_100', 'Before the Sun', 'You rose before Fajr one hundred times.', 'streak', 'epic', true, 100, 10000, null),
  ('ach_secret_no_shop', 'The Ascetic', 'Reach Zone 10 having bought nothing.', 'zones', 'epic', true, 10, 8000, null),
  ('ach_secret_comeback', 'He Came Back', 'Return and rebuild after breaking a 30-day streak.', 'streak', 'rare', true, 30, 2500, null)
on conflict ("id") do update set
  "name" = excluded."name",
  "description" = excluded."description",
  "category" = excluded."category",
  "rarity" = excluded."rarity",
  "secret" = excluded."secret",
  "target" = excluded."target",
  "reward_coins" = excluded."reward_coins",
  "season_id" = excluded."season_id"
;

-- Seasons ----------------------------------------------------------

insert into public.seasons ("id", "number", "name", "theme", "start_date", "end_date") values
  ('season_1', 1, 'Season of Sabr', 'Patience under weight. The first road is the longest.', '2026-09-07', '2026-10-26'),
  ('season_2', 2, 'Season of Yaqin', 'Certainty. The whispers get louder the closer you get.', '2026-10-26', '2026-12-14'),
  ('season_3', 3, 'Season of Ihsan', 'Excellence when nobody is watching.', '2026-12-14', '2027-02-01')
on conflict ("id") do update set
  "number" = excluded."number",
  "name" = excluded."name",
  "theme" = excluded."theme",
  "start_date" = excluded."start_date",
  "end_date" = excluded."end_date"
;

commit;
