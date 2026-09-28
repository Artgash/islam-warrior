-- =====================================================================
-- STEP 3 of 4 - functions, triggers, leaderboard views
-- If this fails on pg_cron, enable that extension and re-run. Only the scheduled jobs need it.
-- =====================================================================
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
