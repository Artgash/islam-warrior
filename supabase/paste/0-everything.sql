-- =====================================================================
-- EVERYTHING - paste this one file and press run
-- Tables, security, logic and content in the order they have to happen. Nothing else is required.
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


-- =====================================================================
-- ISLAM WARRIOR — row level security
-- 0002: every table locked down, then opened deliberately
--
-- Principle: a player reads and writes only their own rows. Static game
-- data is world-readable to authenticated users. Leaderboard visibility
-- is granted through views, not by opening the underlying tables.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false);
$$;

create or replace function public.my_guild_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select guild_id from public.guild_members where user_id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------

alter table public.users                  enable row level security;
alter table public.characters             enable row level security;
alter table public.habits                 enable row level security;
alter table public.habit_logs             enable row level security;
alter table public.zones                  enable row level security;
alter table public.monsters               enable row level security;
alter table public.gear_items             enable row level security;
alter table public.consumable_items       enable row level security;
alter table public.ranks                  enable row level security;
alter table public.iblis_taunts           enable row level security;
alter table public.iblis_replies          enable row level security;
alter table public.achievements           enable row level security;
alter table public.seasons                enable row level security;
alter table public.inventory              enable row level security;
alter table public.equipped_items         enable row level security;
alter table public.active_effects         enable row level security;
alter table public.legendary_fragments    enable row level security;
alter table public.coins_transactions     enable row level security;
alter table public.rank_history           enable row level security;
alter table public.user_achievements      enable row level security;
alter table public.taunt_logs             enable row level security;
alter table public.battles                enable row level security;
alter table public.battle_logs            enable row level security;
alter table public.monster_instances      enable row level security;
alter table public.guilds                 enable row level security;
alter table public.guild_members          enable row level security;
alter table public.guild_chat             enable row level security;
alter table public.guild_quests           enable row level security;
alter table public.guild_wars             enable row level security;
alter table public.leaderboard_snapshots  enable row level security;
alter table public.season_progress        enable row level security;
alter table public.monthly_rewards        enable row level security;
alter table public.notifications          enable row level security;
alter table public.admin_actions          enable row level security;
alter table public.cheat_flags            enable row level security;
alter table public.friendships            enable row level security;

-- ---------------------------------------------------------------------
-- Static game data: readable by any signed-in player, writable by admins
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'zones','monsters','gear_items','consumable_items','ranks',
    'iblis_taunts','iblis_replies','achievements','seasons'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_read', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------

create policy users_select_self on public.users
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy users_update_self on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy users_insert_self on public.users
  for insert to authenticated with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- Owner-only tables
--
-- Each of these carries a user_id; the policy is identical, so it is
-- generated rather than repeated thirteen times.
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'characters','habits','habit_logs','inventory','equipped_items',
    'active_effects','legendary_fragments','coins_transactions',
    'rank_history','user_achievements','taunt_logs','battles',
    'battle_logs','monster_instances','season_progress',
    'monthly_rewards','notifications','friendships'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.uid() or public.is_admin())',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())',
      t || '_delete_own', t);
  end loop;
end $$;

-- Monthly relics are awarded by admins, never self-granted.
drop policy if exists monthly_rewards_insert_own on public.monthly_rewards;
drop policy if exists monthly_rewards_update_own on public.monthly_rewards;
drop policy if exists monthly_rewards_delete_own on public.monthly_rewards;

create policy monthly_rewards_admin_write on public.monthly_rewards
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Guilds
-- ---------------------------------------------------------------------

-- Guild directories are public to signed-in players so they can be browsed.
create policy guilds_read on public.guilds
  for select to authenticated using (true);

create policy guilds_create on public.guilds
  for insert to authenticated with check (leader_id = auth.uid());

create policy guilds_leader_update on public.guilds
  for update to authenticated
  using (leader_id = auth.uid() or public.is_admin())
  with check (leader_id = auth.uid() or public.is_admin());

create policy guilds_leader_delete on public.guilds
  for delete to authenticated using (leader_id = auth.uid() or public.is_admin());

-- Membership is visible to anyone (rosters are public), but only the
-- member themselves or the guild leader can change it.
create policy guild_members_read on public.guild_members
  for select to authenticated using (true);

create policy guild_members_join on public.guild_members
  for insert to authenticated with check (user_id = auth.uid());

create policy guild_members_leave on public.guild_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.guilds g
      where g.id = guild_id and g.leader_id = auth.uid()
    )
    or public.is_admin()
  );

create policy guild_members_promote on public.guild_members
  for update to authenticated
  using (
    exists (select 1 from public.guilds g where g.id = guild_id and g.leader_id = auth.uid())
    or public.is_admin()
  )
  with check (true);

-- Chat is readable only by members of that guild.
create policy guild_chat_read on public.guild_chat
  for select to authenticated using (guild_id = public.my_guild_id() or public.is_admin());

create policy guild_chat_write on public.guild_chat
  for insert to authenticated
  with check (user_id = auth.uid() and guild_id = public.my_guild_id());

create policy guild_chat_delete on public.guild_chat
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.guilds g where g.id = guild_id and g.leader_id = auth.uid())
    or public.is_admin()
  );

create policy guild_quests_read on public.guild_quests
  for select to authenticated using (guild_id = public.my_guild_id() or public.is_admin());

create policy guild_wars_read on public.guild_wars
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- Leaderboards
-- ---------------------------------------------------------------------

create policy leaderboard_snapshots_read on public.leaderboard_snapshots
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- Admin-only tables
-- ---------------------------------------------------------------------

create policy admin_actions_admin on public.admin_actions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy cheat_flags_admin on public.cheat_flags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;


-- =====================================================================
-- ISLAM WARRIOR — functions, triggers, views and scheduled jobs
-- 0003
-- =====================================================================

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_character_updated_at on public.characters;
create trigger update_character_updated_at
  before update on public.characters
  for each row execute function public.touch_updated_at();

drop trigger if exists update_habit_updated_at on public.habits;
create trigger update_habit_updated_at
  before update on public.habits
  for each row execute function public.touch_updated_at();

drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- New auth user -> public.users row
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Rank derivation
-- ---------------------------------------------------------------------

-- The tier a lifetime rank-XP total belongs to.
create or replace function public.tier_for_xp(p_xp bigint)
returns smallint
language sql
stable
as $$
  select coalesce(
    (select tier from public.ranks where xp_required <= p_xp order by tier desc limit 1),
    1::smallint
  );
$$;

-- Divisions split a tier's XP band into thirds, counted down III -> I.
create or replace function public.division_for_xp(p_xp bigint)
returns smallint
language plpgsql
stable
as $$
declare
  v_tier    smallint := public.tier_for_xp(p_xp);
  v_floor   bigint;
  v_ceiling bigint;
  v_ratio   numeric;
begin
  if v_tier >= 10 then
    return 1;
  end if;

  select xp_required into v_floor   from public.ranks where tier = v_tier;
  select xp_required into v_ceiling from public.ranks where tier = v_tier + 1;

  if v_ceiling <= v_floor then
    return 1;
  end if;

  v_ratio := (p_xp - v_floor)::numeric / (v_ceiling - v_floor)::numeric;

  if v_ratio < (1.0/3.0) then return 3;
  elsif v_ratio < (2.0/3.0) then return 2;
  else return 1;
  end if;
end;
$$;

-- Keep rank_tier / rank_division consistent with rank_xp, and record the
-- change in rank_history whenever the player actually moves.
create or replace function public.recalc_rank_on_xp_change()
returns trigger
language plpgsql
as $$
declare
  v_tier     smallint;
  v_division smallint;
begin
  if new.rank_xp is not distinct from old.rank_xp then
    return new;
  end if;

  v_tier     := public.tier_for_xp(new.rank_xp);
  v_division := public.division_for_xp(new.rank_xp);

  new.rank_tier     := v_tier;
  new.rank_division := v_division;

  if v_tier is distinct from old.rank_tier
     or v_division is distinct from old.rank_division then
    insert into public.rank_history (user_id, tier, division, direction)
    values (
      new.user_id,
      v_tier,
      v_division,
      case
        when v_tier > old.rank_tier then 'up'
        when v_tier < old.rank_tier then 'down'
        when v_division < old.rank_division then 'up'
        else 'down'
      end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists recalc_rank on public.characters;
create trigger recalc_rank
  before update on public.characters
  for each row execute function public.recalc_rank_on_xp_change();

-- ---------------------------------------------------------------------
-- Stats from habit logs
--
-- Each category trains one stat, +1 per completion, capped at +5 per day
-- and 999 overall. The daily cap is enforced here rather than in the app
-- so it holds even against a hand-crafted request.
-- ---------------------------------------------------------------------

create or replace function public.stat_for_category(p_category habit_category)
returns text
language sql
immutable
as $$
  select case p_category
    when 'faith'        then 'faith'
    when 'intelligence' then 'intelligence'
    when 'strength'     then 'strength'
    when 'charisma'     then 'charisma'
    when 'discipline'   then 'endurance'
    when 'bad_habit'    then 'defense_stat'
  end;
$$;

create or replace function public.recalc_stats_on_habit_log_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stat       text := public.stat_for_category(new.category);
  v_today_count integer;
begin
  -- How many points of this stat were already earned today?
  select count(*) into v_today_count
  from public.habit_logs
  where user_id = new.user_id
    and date = new.date
    and public.stat_for_category(category) = v_stat
    and id <> new.id;

  if v_today_count < 5 then
    execute format(
      'update public.characters set %I = least(999, %I + 1) where user_id = $1',
      v_stat, v_stat
    ) using new.user_id;
  end if;

  update public.characters
  set total_habits_completed = total_habits_completed + 1,
      last_habit_date        = greatest(coalesce(last_habit_date, new.date), new.date)
  where user_id = new.user_id;

  update public.habits
  set total_completions = total_completions + 1
  where id = new.habit_id;

  return new;
end;
$$;

drop trigger if exists recalc_stats on public.habit_logs;
create trigger recalc_stats
  after insert on public.habit_logs
  for each row execute function public.recalc_stats_on_habit_log_insert();

-- ---------------------------------------------------------------------
-- Guild bookkeeping
-- ---------------------------------------------------------------------

create or replace function public.sync_guild_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.guilds set member_count = member_count + 1 where id = new.guild_id;
    return new;
  else
    update public.guilds
    set member_count = greatest(0, member_count - 1)
    where id = old.guild_id;
    return old;
  end if;
end;
$$;

drop trigger if exists guild_member_count_insert on public.guild_members;
create trigger guild_member_count_insert
  after insert on public.guild_members
  for each row execute function public.sync_guild_member_count();

drop trigger if exists guild_member_count_delete on public.guild_members;
create trigger guild_member_count_delete
  after delete on public.guild_members
  for each row execute function public.sync_guild_member_count();

create or replace function public.guild_rank_for(p_weekly_xp bigint)
returns text
language sql
immutable
as $$
  select case
    when p_weekly_xp >= 500000 then 'Legendary'
    when p_weekly_xp >= 200000 then 'Diamond'
    when p_weekly_xp >=  80000 then 'Platinum'
    when p_weekly_xp >=  30000 then 'Gold'
    when p_weekly_xp >=  10000 then 'Silver'
    else 'Bronze'
  end;
$$;

-- ---------------------------------------------------------------------
-- Leaderboard views
--
-- Views, not tables: they are always current and they expose exactly the
-- public-safe columns. Individual habits are never among them.
-- ---------------------------------------------------------------------

create or replace view public.leaderboard_weekly
with (security_invoker = off) as
select
  c.user_id,
  c.name,
  c.avatar_id,
  c.rank_tier,
  c.rank_division,
  c.level,
  coalesce(sum(l.xp_gained), 0)::bigint as value,
  c.current_zone,
  c.current_monster_index
from public.characters c
left join public.habit_logs l
  on l.user_id = c.user_id
 and l.created_at >= date_trunc('week', (now() at time zone 'utc'))
group by c.user_id, c.name, c.avatar_id, c.rank_tier, c.rank_division,
         c.level, c.current_zone, c.current_monster_index
order by value desc
limit 100;

create or replace view public.leaderboard_global
with (security_invoker = off) as
select
  user_id, name, avatar_id, rank_tier, rank_division, level,
  total_xp_earned as value, current_zone, current_monster_index
from public.characters
order by total_xp_earned desc
limit 100;

create or replace view public.leaderboard_slayers
with (security_invoker = off) as
select
  user_id, name, avatar_id, rank_tier, rank_division, level,
  total_monsters_killed as value, current_zone, current_monster_index
from public.characters
order by total_monsters_killed desc
limit 100;

create or replace view public.leaderboard_deep_road
with (security_invoker = off) as
select
  user_id, name, avatar_id, rank_tier, rank_division, level,
  (current_zone::bigint * 16 + current_monster_index) as value,
  current_zone, current_monster_index
from public.characters
order by current_zone desc, current_monster_index desc
limit 100;

create or replace view public.guild_members_view
with (security_invoker = off) as
select
  gm.guild_id,
  gm.user_id,
  gm.role,
  gm.joined_at,
  c.name,
  c.avatar_id,
  c.rank_tier,
  c.total_xp_earned as total_xp,
  coalesce(w.value, 0) as weekly_xp,
  coalesce(c.last_habit_date, current_date) as last_active
from public.guild_members gm
join public.characters c on c.user_id = gm.user_id
left join public.leaderboard_weekly w on w.user_id = gm.user_id;

grant select on
  public.leaderboard_weekly,
  public.leaderboard_global,
  public.leaderboard_slayers,
  public.leaderboard_deep_road,
  public.guild_members_view
to authenticated;

-- ---------------------------------------------------------------------
-- Rank decay (daily cron)
--
-- Mirrors src/game/ranks/decay.ts: 3-6 days = 5%, 7-13 = 10%, 14+ = 15%,
-- and never below the entry XP of the player's current division.
-- ---------------------------------------------------------------------

create or replace function public.division_floor(p_xp bigint)
returns bigint
language plpgsql
stable
as $$
declare
  v_tier     smallint := public.tier_for_xp(p_xp);
  v_division smallint := public.division_for_xp(p_xp);
  v_floor    bigint;
  v_ceiling  bigint;
begin
  select xp_required into v_floor from public.ranks where tier = v_tier;

  if v_tier >= 10 then
    return v_floor;
  end if;

  select xp_required into v_ceiling from public.ranks where tier = v_tier + 1;

  return v_floor + ((v_ceiling - v_floor) * (3 - v_division) / 3);
end;
$$;

create or replace function public.apply_rank_decay_daily()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r          record;
  v_days     integer;
  v_percent  numeric;
  v_proposed bigint;
  v_floor    bigint;
begin
  for r in
    select user_id, rank_xp, last_habit_date
    from public.characters
    where last_habit_date is not null
      and last_habit_date < current_date - interval '2 days'
  loop
    v_days := current_date - r.last_habit_date;

    v_percent := case
      when v_days between 3 and 6  then 0.05
      when v_days between 7 and 13 then 0.10
      when v_days >= 14            then 0.15
      else 0
    end;

    if v_percent = 0 then
      continue;
    end if;

    v_floor    := public.division_floor(r.rank_xp);
    v_proposed := greatest(v_floor, floor(r.rank_xp * (1 - v_percent))::bigint);

    if v_proposed < r.rank_xp then
      update public.characters set rank_xp = v_proposed where user_id = r.user_id;

      insert into public.notifications (user_id, type, title, body)
      values (
        r.user_id,
        'rank_change',
        'Rank decay',
        format(
          '%s days away cost you %s rank XP. Return today and you gain more than you lost.',
          v_days, r.rank_xp - v_proposed
        )
      );
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Weekly reset (Monday 00:00 UTC)
-- ---------------------------------------------------------------------

create or replace function public.reset_weekly_leaderboards()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week text := to_char(now() at time zone 'utc' - interval '1 day', 'IYYY-"W"IW');
begin
  -- Archive last week before it disappears.
  insert into public.leaderboard_snapshots (week, user_id, position, xp, rank_tier)
  select
    v_week,
    user_id,
    row_number() over (order by value desc),
    value,
    rank_tier
  from public.leaderboard_weekly
  on conflict (week, user_id) do nothing;

  -- Guild weekly totals roll into lifetime and reset.
  update public.guilds
  set total_xp  = total_xp + weekly_xp,
      weekly_xp = 0,
      rank      = public.guild_rank_for(weekly_xp);
end;
$$;

-- ---------------------------------------------------------------------
-- Iblis: pick a taunt for a player, honouring the cadence rules
-- ---------------------------------------------------------------------

create or replace function public.fire_iblis_taunt(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last    timestamptz;
  v_taunt   record;
  v_log_id  uuid;
begin
  select max(fired_at) into v_last from public.taunt_logs where user_id = p_user_id;

  -- At most one per five days.
  if v_last is not null and v_last > now() - interval '5 days' then
    return null;
  end if;

  -- Prefer a line this player has not heard.
  select t.* into v_taunt
  from public.iblis_taunts t
  where not exists (
    select 1 from public.taunt_logs l
    where l.user_id = p_user_id and l.taunt_id = t.id
  )
  order by random()
  limit 1;

  if v_taunt.id is null then
    select * into v_taunt from public.iblis_taunts order by random() limit 1;
  end if;

  insert into public.taunt_logs (user_id, taunt_id, taunt_text)
  values (p_user_id, v_taunt.id, v_taunt.text)
  returning id into v_log_id;

  insert into public.notifications (user_id, type, title, body)
  values (p_user_id, 'iblis_taunt', 'Iblis speaks', v_taunt.text);

  return v_log_id;
end;
$$;

-- Weekly sweep: only players active in the last fortnight are spoken to.
create or replace function public.fire_iblis_taunt_weekly()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in
    select user_id from public.characters
    where last_habit_date is not null
      and last_habit_date > current_date - interval '14 days'
  loop
    perform public.fire_iblis_taunt(r.user_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Anti-cheat sweep
--
-- The unique (habit_id, date) constraint already makes double-logging
-- impossible. This catches the subtler shapes: impossible XP rates and
-- suspiciously large single awards.
-- ---------------------------------------------------------------------

create or replace function public.anti_cheat_scan()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- More than 40 completions in one day is beyond any plausible roster.
  insert into public.cheat_flags (user_id, reason, details)
  select
    user_id,
    'excessive_daily_completions',
    jsonb_build_object('date', date, 'count', count(*))
  from public.habit_logs
  where date >= current_date - 1
  group by user_id, date
  having count(*) > 40
  on conflict do nothing;

  -- A single log awarding more XP than the highest legitimate combination.
  insert into public.cheat_flags (user_id, reason, details)
  select
    user_id,
    'improbable_xp_award',
    jsonb_build_object('log_id', id, 'xp', xp_gained)
  from public.habit_logs
  where created_at >= now() - interval '1 day'
    and xp_gained > 5000
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------
-- Guild war matchmaking (weekly)
-- ---------------------------------------------------------------------

create or replace function public.guild_war_matchmake()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week   text := to_char(now() at time zone 'utc', 'IYYY-"W"IW');
  v_ends   timestamptz := date_trunc('week', (now() at time zone 'utc')) + interval '7 days';
  v_prev   uuid := null;
  r        record;
begin
  -- Pair guilds by adjacent weekly XP, so matches stay competitive.
  for r in
    select g.id
    from public.guilds g
    where not exists (
      select 1 from public.guild_wars w
      where w.week = v_week and (w.guild_a = g.id or w.guild_b = g.id)
    )
    order by g.weekly_xp desc
  loop
    if v_prev is null then
      v_prev := r.id;
    else
      insert into public.guild_wars (week, guild_a, guild_b, ends_at)
      values (v_week, v_prev, r.id, v_ends)
      on conflict do nothing;
      v_prev := null;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Season rollover: soft rank reset
-- ---------------------------------------------------------------------

create or replace function public.season_rollover()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r         record;
  v_drop    smallint;
  v_target  smallint;
  v_floor   bigint;
  v_ceiling bigint;
  v_new     bigint;
begin
  for r in select user_id, rank_tier, rank_xp from public.characters loop
    v_drop   := case when r.rank_tier >= 8 then 2 else 1 end;
    v_target := greatest(1, r.rank_tier - v_drop);

    select xp_required into v_floor from public.ranks where tier = v_target;

    if v_target >= 10 then
      v_new := v_floor;
    else
      select xp_required into v_ceiling from public.ranks where tier = v_target + 1;
      v_new := v_floor + ((v_ceiling - v_floor) / 6);
    end if;

    update public.characters
    set rank_xp = least(r.rank_xp, v_new)
    where user_id = r.user_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Scheduled jobs
-- ---------------------------------------------------------------------

select cron.unschedule('weekly-reset')      where exists (select 1 from cron.job where jobname = 'weekly-reset');
select cron.unschedule('rank-decay-daily')  where exists (select 1 from cron.job where jobname = 'rank-decay-daily');
select cron.unschedule('iblis-weekly')      where exists (select 1 from cron.job where jobname = 'iblis-weekly');
select cron.unschedule('anti-cheat-daily')  where exists (select 1 from cron.job where jobname = 'anti-cheat-daily');
select cron.unschedule('guild-war-weekly')  where exists (select 1 from cron.job where jobname = 'guild-war-weekly');

-- Monday 00:00 UTC — the weekly reset is sacred.
select cron.schedule('weekly-reset',     '0 0 * * 1', $$select public.reset_weekly_leaderboards()$$);
select cron.schedule('guild-war-weekly', '5 0 * * 1', $$select public.guild_war_matchmake()$$);
-- 03:00 UTC daily, well away from anyone's evening.
select cron.schedule('rank-decay-daily', '0 3 * * *', $$select public.apply_rank_decay_daily()$$);
select cron.schedule('anti-cheat-daily', '30 3 * * *', $$select public.anti_cheat_scan()$$);
-- Wednesday 14:00 UTC — inside waking hours for most of the world.
select cron.schedule('iblis-weekly',     '0 14 * * 3', $$select public.fire_iblis_taunt_weekly()$$);


-- =====================================================================
-- ISLAM WARRIOR - guild chat authorship
--
-- guild_chat stores only user_id: no author name, no avatar. That is the
-- right shape, because a name belongs to the character and a copy frozen
-- into each message would keep showing the old one after a rename.
--
-- The client needs the name to render a message though, and PostgREST
-- cannot join guild_chat to characters on its own - both point at
-- public.users, so there is no direct foreign key between them. This view
-- does the join, so every read resolves the name as it is right now.
-- =====================================================================

create or replace view public.guild_chat_view
with (security_invoker = off) as
select
  gc.id,
  gc.guild_id,
  gc.user_id,
  gc.body,
  gc.created_at,
  coalesce(c.name, 'Warrior')      as author_name,
  coalesce(c.avatar_id, 'av_ash')  as avatar_id
from public.guild_chat gc
left join public.characters c on c.user_id = gc.user_id;

-- Membership is what gates chat, and the view is security definer, so the
-- grant is to any signed-in player; the guild filter is applied by the
-- query. Matches how guild_members_view is exposed.
grant select on public.guild_chat_view to authenticated;


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
