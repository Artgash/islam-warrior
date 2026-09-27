-- =====================================================================
-- STEP 2 of 4 - row-level security
-- Run after step 1. Nothing is readable until this runs.
-- =====================================================================
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
