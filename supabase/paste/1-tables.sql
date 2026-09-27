-- =====================================================================
-- STEP 1 of 4 - tables
-- Run this first. Creates every table.
-- =====================================================================
-- =====================================================================
-- ISLAM WARRIOR — schema
-- 0001: tables, types, indexes
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

do $$ begin
  create type habit_category as enum
    ('faith','intelligence','strength','charisma','discipline','bad_habit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type frequency_type as enum ('daily','x_per_week','custom_days');
exception when duplicate_object then null; end $$;

do $$ begin
  create type archetype as enum ('warrior','scholar','monk','knight','sultan','wali');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gear_slot as enum ('sword','shield','armor','helmet','ring','boots');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rarity as enum ('common','rare','epic','legendary','mythic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type guild_role as enum ('leader','officer','member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coin_reason as enum
    ('habit','kill','boss','loot','level_up','purchase','quest','season','achievement','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum
    ('habit_reminder','iblis_taunt','rank_change','guild','season','reward','system');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Users (extends auth.users)
-- ---------------------------------------------------------------------

create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  is_admin      boolean not null default false,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Characters
-- ---------------------------------------------------------------------

create table if not exists public.characters (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null unique references public.users(id) on delete cascade,

  name                   text not null check (char_length(name) between 2 and 20),
  avatar_id              text not null,
  archetype              archetype not null default 'warrior',
  title                  text,

  level                  integer not null default 1 check (level >= 1),
  xp                     bigint  not null default 0 check (xp >= 0),

  hp                     integer not null default 100 check (hp >= 0),
  max_hp                 integer not null default 100 check (max_hp > 0),
  base_attack            integer not null default 10,
  base_defense           integer not null default 5,
  crit_chance            real    not null default 0.05,
  crit_multiplier        real    not null default 2.0,

  coins                  bigint  not null default 100 check (coins >= 0),
  gems                   integer not null default 0 check (gems >= 0),

  rank_tier              smallint not null default 1  check (rank_tier between 1 and 10),
  rank_division          smallint not null default 3  check (rank_division between 1 and 3),
  rank_xp                bigint   not null default 0  check (rank_xp >= 0),

  current_zone           smallint not null default 1  check (current_zone between 1 and 66),
  current_monster_index  smallint not null default 0  check (current_monster_index between 0 and 15),
  -- Iblis exceeds bigint comfortably but fits numeric.
  current_monster_hp     numeric(30,0) not null default 50,

  streak                 integer not null default 0,
  longest_streak         integer not null default 0,
  last_habit_date        date,

  morale_buff_expires    timestamptz,
  morale_buff_percent    real not null default 0,
  fallen_at              timestamptz,

  -- Six stats, each capped at 999.
  strength               smallint not null default 0 check (strength between 0 and 999),
  defense_stat           smallint not null default 0 check (defense_stat between 0 and 999),
  intelligence           smallint not null default 0 check (intelligence between 0 and 999),
  endurance              smallint not null default 0 check (endurance between 0 and 999),
  faith                  smallint not null default 0 check (faith between 0 and 999),
  charisma               smallint not null default 0 check (charisma between 0 and 999),

  total_monsters_killed  integer not null default 0,
  total_bosses_killed    integer not null default 0,
  total_habits_completed integer not null default 0,
  total_coins_earned     bigint  not null default 0,
  total_xp_earned        bigint  not null default 0,
  days_active            integer not null default 0,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Habits
-- ---------------------------------------------------------------------

create table if not exists public.habits (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,

  name              text not null check (char_length(name) between 2 and 50),
  description       text check (char_length(description) <= 200),
  category          habit_category not null,
  intensity         smallint not null check (intensity between 1 and 5),

  frequency_type    frequency_type not null default 'daily',
  frequency_value   smallint not null default 7 check (frequency_value between 1 and 7),
  days_of_week      smallint[] not null default '{0,1,2,3,4,5,6}',

  cue_time          time,
  cue_trigger       text check (char_length(cue_trigger) <= 60),

  is_active         boolean not null default true,
  streak            integer not null default 0,
  longest_streak    integer not null default 0,
  total_completions integer not null default 0,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists habits_user_idx on public.habits (user_id) where is_active;

-- ---------------------------------------------------------------------
-- Habit logs — one row per completion
-- ---------------------------------------------------------------------

create table if not exists public.habit_logs (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  habit_id       uuid not null references public.habits(id) on delete cascade,

  date           date not null,
  intensity      smallint not null check (intensity between 1 and 5),
  category       habit_category not null,

  xp_gained      integer not null default 0,
  coins_gained   integer not null default 0,
  damage_dealt   numeric(30,0) not null default 0,
  was_crit       boolean not null default false,
  combo_at_time  smallint not null default 0,

  created_at     timestamptz not null default now(),

  -- Anti-cheat, enforced by the database: one completion per habit per day.
  unique (habit_id, date)
);

create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, date desc);
create index if not exists habit_logs_created_idx  on public.habit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- Static game data (seeded, readable by everyone)
-- ---------------------------------------------------------------------

create table if not exists public.zones (
  id         smallint primary key check (id between 1 and 66),
  name       text not null,
  theme      text not null,
  boss_name  text not null,
  base_hp    numeric(30,0) not null,
  lore       text not null
);

create table if not exists public.monsters (
  id           text primary key,
  zone_id      smallint not null references public.zones(id) on delete cascade,
  index        smallint not null check (index between 0 and 15),
  name         text not null,
  description  text not null,
  image_prompt text not null,
  max_hp       numeric(30,0) not null,
  attack       integer not null,
  defense      integer not null,
  xp_reward    integer not null,
  coin_reward  integer not null,
  is_boss      boolean not null default false,
  unique (zone_id, index)
);

create index if not exists monsters_zone_idx on public.monsters (zone_id, index);

create table if not exists public.gear_items (
  id            text primary key,
  name          text not null,
  arabic        text,
  slot          gear_slot not null,
  tier          smallint not null,
  rarity        rarity not null,
  price         bigint not null default 0,
  stats         jsonb not null default '{}'::jsonb,
  description   text not null,
  required_rank smallint not null default 1,
  is_award_only boolean not null default false,
  awarded_label text
);

create table if not exists public.consumable_items (
  id              text primary key,
  name            text not null,
  price           bigint not null,
  effect          text not null,
  magnitude       real not null,
  duration_hours  smallint not null default 0,
  description     text not null,
  required_rank   smallint not null default 1
);

create table if not exists public.ranks (
  tier         smallint primary key check (tier between 1 and 10),
  name         text not null,
  arabic       text not null,
  english      text not null,
  color        text not null,
  accent       text,
  xp_required  bigint not null,
  multiplier   real not null,
  max_habits   smallint not null,
  unlocks      text[] not null default '{}'
);

create table if not exists public.iblis_taunts (
  id   smallint primary key,
  text text not null
);

create table if not exists public.iblis_replies (
  id              smallint primary key,
  text            text not null,
  morale_percent  real not null default 0.10
);

create table if not exists public.achievements (
  id            text primary key,
  name          text not null,
  description   text not null,
  category      text not null,
  rarity        rarity not null,
  secret        boolean not null default false,
  target        bigint not null,
  reward_coins  bigint not null default 0,
  season_id     text
);

create table if not exists public.seasons (
  id          text primary key,
  number      smallint not null,
  name        text not null,
  theme       text not null,
  start_date  date not null,
  end_date    date not null
);

-- ---------------------------------------------------------------------
-- Player-owned game state
-- ---------------------------------------------------------------------

create table if not exists public.inventory (
  user_id       uuid not null references public.users(id) on delete cascade,
  item_id       text not null,
  quantity      integer not null default 1 check (quantity > 0),
  awarded_label text,
  acquired_at   timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.equipped_items (
  user_id uuid primary key references public.users(id) on delete cascade,
  sword   text references public.gear_items(id),
  shield  text references public.gear_items(id),
  armor   text references public.gear_items(id),
  helmet  text references public.gear_items(id),
  ring    text references public.gear_items(id),
  boots   text references public.gear_items(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.active_effects (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  effect     text not null,
  magnitude  real not null,
  expires_at timestamptz,
  charges    integer,
  source     text not null,
  created_at timestamptz not null default now()
);

create index if not exists active_effects_user_idx on public.active_effects (user_id);

create table if not exists public.legendary_fragments (
  user_id uuid primary key references public.users(id) on delete cascade,
  count   integer not null default 0 check (count >= 0)
);

create table if not exists public.coins_transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  amount        bigint not null,
  reason        coin_reason not null,
  note          text not null default '',
  balance_after bigint not null,
  created_at    timestamptz not null default now()
);

create index if not exists coins_tx_user_idx on public.coins_transactions (user_id, created_at desc);

create table if not exists public.rank_history (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  tier       smallint not null,
  division   smallint not null,
  direction  text not null check (direction in ('up','down')),
  reached_at timestamptz not null default now()
);

create index if not exists rank_history_user_idx on public.rank_history (user_id, reached_at desc);

create table if not exists public.user_achievements (
  user_id        uuid not null references public.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.taunt_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  taunt_id   smallint not null references public.iblis_taunts(id),
  taunt_text text not null,
  fired_at   timestamptz not null default now(),
  replied_at timestamptz,
  reply_id   smallint references public.iblis_replies(id),
  reply_text text
);

create index if not exists taunt_logs_user_idx on public.taunt_logs (user_id, fired_at desc);

-- ---------------------------------------------------------------------
-- Battles
-- ---------------------------------------------------------------------

create table if not exists public.battles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  zone_id     smallint not null,
  monster_id  text not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  outcome     text check (outcome in ('victory','fallen','abandoned'))
);

create index if not exists battles_user_idx on public.battles (user_id, started_at desc);

create table if not exists public.battle_logs (
  id         uuid primary key default uuid_generate_v4(),
  battle_id  uuid not null references public.battles(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  event_type text not null,
  message    text not null,
  amount     numeric(30,0),
  created_at timestamptz not null default now()
);

create index if not exists battle_logs_battle_idx on public.battle_logs (battle_id, created_at);

create table if not exists public.monster_instances (
  user_id    uuid not null references public.users(id) on delete cascade,
  zone_id    smallint not null,
  index      smallint not null,
  current_hp numeric(30,0) not null,
  status     text not null default 'active' check (status in ('active','defeated')),
  updated_at timestamptz not null default now(),
  primary key (user_id, zone_id, index)
);

create index if not exists monster_instances_user_idx
  on public.monster_instances (user_id, zone_id, index);

-- ---------------------------------------------------------------------
-- Guilds
-- ---------------------------------------------------------------------

create table if not exists public.guilds (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null unique check (char_length(name) between 3 and 30),
  tag          text not null check (char_length(tag) between 2 and 5),
  description  text not null default '' check (char_length(description) <= 200),
  emblem_id    text not null default 'em_crossed',
  leader_id    uuid not null references public.users(id) on delete cascade,
  member_count integer not null default 1 check (member_count between 0 and 30),
  total_xp     bigint not null default 0,
  weekly_xp    bigint not null default 0,
  rank         text not null default 'Bronze',
  created_at   timestamptz not null default now()
);

create table if not exists public.guild_members (
  guild_id  uuid not null references public.guilds(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  role      guild_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (guild_id, user_id),
  -- A warrior stands with one guild at a time.
  unique (user_id)
);

create table if not exists public.guild_chat (
  id         uuid primary key default uuid_generate_v4(),
  guild_id   uuid not null references public.guilds(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists guild_chat_guild_idx on public.guild_chat (guild_id, created_at desc);

create table if not exists public.guild_quests (
  id           uuid primary key default uuid_generate_v4(),
  guild_id     uuid not null references public.guilds(id) on delete cascade,
  week         text not null,
  title        text not null,
  description  text not null,
  target       bigint not null,
  progress     bigint not null default 0,
  reward_coins bigint not null default 0,
  unique (guild_id, week, title)
);

create table if not exists public.guild_wars (
  id           uuid primary key default uuid_generate_v4(),
  week         text not null,
  guild_a      uuid not null references public.guilds(id) on delete cascade,
  guild_b      uuid not null references public.guilds(id) on delete cascade,
  guild_a_xp   bigint not null default 0,
  guild_b_xp   bigint not null default 0,
  ends_at      timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (week, guild_a, guild_b)
);

-- ---------------------------------------------------------------------
-- Leaderboards + seasons + admin
-- ---------------------------------------------------------------------

create table if not exists public.leaderboard_snapshots (
  id         uuid primary key default uuid_generate_v4(),
  week       text not null,
  user_id    uuid not null references public.users(id) on delete cascade,
  position   integer not null,
  xp         bigint not null,
  rank_tier  smallint not null,
  created_at timestamptz not null default now(),
  unique (week, user_id)
);

create index if not exists leaderboard_snapshots_week_idx
  on public.leaderboard_snapshots (week, xp desc);

create table if not exists public.season_progress (
  season_id       text not null references public.seasons(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  season_xp       bigint not null default 0,
  tier            smallint not null default 0,
  premium         boolean not null default false,
  claimed_free    smallint[] not null default '{}',
  claimed_premium smallint[] not null default '{}',
  primary key (season_id, user_id)
);

create table if not exists public.monthly_rewards (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  item_id    text not null references public.gear_items(id),
  label      text not null,
  month      text not null,
  awarded_at timestamptz not null default now(),
  unique (user_id, item_id, month)
);

create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc) where not read;

create table if not exists public.admin_actions (
  id         uuid primary key default uuid_generate_v4(),
  admin_id   uuid not null references public.users(id) on delete cascade,
  action     text not null,
  target_id  uuid,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cheat_flags (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  reason     text not null,
  details    jsonb not null default '{}'::jsonb,
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  user_id    uuid not null references public.users(id) on delete cascade,
  friend_id  uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
