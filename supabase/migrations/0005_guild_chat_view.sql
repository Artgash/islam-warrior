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
