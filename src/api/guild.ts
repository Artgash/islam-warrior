/**
 * Guild operations. Supabase-backed with Realtime chat; falls back to a
 * local guild so the screen is fully usable single-player.
 */

import type {
  Guild,
  GuildMember,
  GuildMessage,
  GuildQuest,
  GuildRank,
  GuildWar,
  Character,
} from '@/types';
import { isSupabaseConfigured, requireSupabase, supabase } from '@/lib/supabase';
import { currentWeekKey, nowTimestamp } from '@/lib/date';
import { GUILD_CHAT_HISTORY, GUILD_EMBLEMS, GUILD_MAX_MEMBERS } from '@/game/constants';
import { uid } from '@/lib/utils';
import { readJsonSync, writeJson } from '@/platform/storage';

const LOCAL_GUILDS_KEY = 'guilds:list';
const LOCAL_MEMBERS_KEY = 'guilds:members';
const LOCAL_CHAT_KEY = 'guilds:chat';

/* ------------------------------------------------------------------ */
/* Rank derivation                                                     */
/* ------------------------------------------------------------------ */

export function guildRankFor(weeklyXp: number): GuildRank {
  if (weeklyXp >= 500_000) return 'Legendary';
  if (weeklyXp >= 200_000) return 'Diamond';
  if (weeklyXp >= 80_000) return 'Platinum';
  if (weeklyXp >= 30_000) return 'Gold';
  if (weeklyXp >= 10_000) return 'Silver';
  return 'Bronze';
}

export const GUILD_RANK_COLORS: Record<GuildRank, string> = {
  Bronze: '#92400E',
  Silver: '#9CA3AF',
  Gold: '#D4AF37',
  Platinum: '#E5E7EB',
  Diamond: '#67E8F9',
  Legendary: '#FBBF24',
};

/* ------------------------------------------------------------------ */
/* Seed guilds for local mode                                          */
/* ------------------------------------------------------------------ */

const SEED_GUILDS: Omit<Guild, 'id' | 'created_at'>[] = [
  { name: 'Companions of Badr', tag: 'BADR', description: 'Outnumbered, never outfought. Daily Fajr check-in.', emblem_id: 'em_crossed', leader_id: 'rival_0', member_count: 24, total_xp: 1_240_000, weekly_xp: 86_400, rank: 'Platinum' },
  { name: 'The Night Risers', tag: 'QIYAM', description: 'Tahajjud or nothing. We wake each other.', emblem_id: 'em_crescent', leader_id: 'rival_3', member_count: 18, total_xp: 890_000, weekly_xp: 41_200, rank: 'Gold' },
  { name: 'Sons of Sabr', tag: 'SABR', description: 'Slow, steady, unbreakable. No pressure, only presence.', emblem_id: 'em_flame', leader_id: 'rival_7', member_count: 30, total_xp: 2_100_000, weekly_xp: 212_000, rank: 'Diamond' },
  { name: 'The Iron Fast', tag: 'SAWM', description: 'Mondays and Thursdays. Every week. Together.', emblem_id: 'em_star', leader_id: 'rival_11', member_count: 12, total_xp: 320_000, weekly_xp: 14_800, rank: 'Silver' },
  { name: 'Gatebreakers', tag: 'GATE', description: 'Deep road specialists. Zone 40+ only.', emblem_id: 'em_gate', leader_id: 'rival_15', member_count: 9, total_xp: 1_800_000, weekly_xp: 138_000, rank: 'Platinum' },
  { name: 'The Quiet Ones', tag: 'IHSAN', description: 'No showing off. No leaderboards talk. Just work.', emblem_id: 'em_tower', leader_id: 'rival_19', member_count: 21, total_xp: 640_000, weekly_xp: 33_500, rank: 'Gold' },
];

function localGuilds(): Guild[] {
  const stored = readJsonSync<Guild[] | null>(LOCAL_GUILDS_KEY, null);
  if (stored) return stored;

  const seeded: Guild[] = SEED_GUILDS.map((g, i) => ({
    ...g,
    id: `guild_seed_${i}`,
    created_at: new Date(Date.now() - (i + 1) * 86_400_000 * 30).toISOString(),
  }));

  void writeJson(LOCAL_GUILDS_KEY, seeded);
  return seeded;
}

function localMembers(): Record<string, GuildMember[]> {
  return readJsonSync<Record<string, GuildMember[]>>(LOCAL_MEMBERS_KEY, {});
}

function localChat(): Record<string, GuildMessage[]> {
  return readJsonSync<Record<string, GuildMessage[]>>(LOCAL_CHAT_KEY, {});
}

/* ------------------------------------------------------------------ */
/* Browse / create / join                                              */
/* ------------------------------------------------------------------ */

export async function browseGuilds(search = ''): Promise<Guild[]> {
  if (!isSupabaseConfigured) {
    const term = search.trim().toLowerCase();
    return localGuilds()
      .filter(
        (g) =>
          !term ||
          g.name.toLowerCase().includes(term) ||
          g.tag.toLowerCase().includes(term),
      )
      .sort((a, b) => b.weekly_xp - a.weekly_xp);
  }

  const client = requireSupabase();
  let query = client.from('guilds').select('*').order('weekly_xp', { ascending: false }).limit(50);
  if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Guild[];
}

export interface CreateGuildInput {
  name: string;
  tag: string;
  description: string;
  emblem_id: string;
  character: Character;
}

export async function createGuild(input: CreateGuildInput): Promise<Guild> {
  const guild: Guild = {
    id: uid('guild_'),
    name: input.name.trim(),
    tag: input.tag.trim().toUpperCase(),
    description: input.description.trim(),
    emblem_id: input.emblem_id,
    leader_id: input.character.user_id,
    member_count: 1,
    total_xp: input.character.total_xp_earned,
    weekly_xp: 0,
    rank: 'Bronze',
    created_at: nowTimestamp(),
  };

  if (!isSupabaseConfigured) {
    const guilds = [...localGuilds(), guild];
    await writeJson(LOCAL_GUILDS_KEY, guilds);

    const members = localMembers();
    members[guild.id] = [memberFromCharacter(input.character, guild.id, 'leader')];
    await writeJson(LOCAL_MEMBERS_KEY, members);

    return guild;
  }

  const client = requireSupabase();
  const { data, error } = await client.from('guilds').insert(guild).select().single();
  if (error) throw new Error(error.message);

  await client.from('guild_members').insert({
    guild_id: guild.id,
    user_id: input.character.user_id,
    role: 'leader',
    joined_at: nowTimestamp(),
  });

  return data as Guild;
}

function memberFromCharacter(
  character: Character,
  guildId: string,
  role: GuildMember['role'],
): GuildMember {
  return {
    user_id: character.user_id,
    guild_id: guildId,
    name: character.name,
    avatar_id: character.avatar_id,
    role,
    rank_tier: character.rank_tier,
    weekly_xp: 0,
    total_xp: character.total_xp_earned,
    last_active: (character.last_habit_date ?? nowTimestamp().slice(0, 10)),
    joined_at: nowTimestamp(),
  };
}

export async function joinGuild(guildId: string, character: Character): Promise<void> {
  if (!isSupabaseConfigured) {
    const guilds = localGuilds().map((g) =>
      g.id === guildId ? { ...g, member_count: Math.min(GUILD_MAX_MEMBERS, g.member_count + 1) } : g,
    );
    await writeJson(LOCAL_GUILDS_KEY, guilds);

    const members = localMembers();
    const existing = members[guildId] ?? [];
    members[guildId] = [
      ...existing.filter((m) => m.user_id !== character.user_id),
      memberFromCharacter(character, guildId, 'member'),
    ];
    await writeJson(LOCAL_MEMBERS_KEY, members);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from('guild_members').insert({
    guild_id: guildId,
    user_id: character.user_id,
    role: 'member',
    joined_at: nowTimestamp(),
  });
  if (error) throw new Error(error.message);
}

export async function leaveGuild(guildId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const members = localMembers();
    members[guildId] = (members[guildId] ?? []).filter((m) => m.user_id !== userId);
    await writeJson(LOCAL_MEMBERS_KEY, members);

    const guilds = localGuilds().map((g) =>
      g.id === guildId ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g,
    );
    await writeJson(LOCAL_GUILDS_KEY, guilds);
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from('guild_members')
    .delete()
    .eq('guild_id', guildId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

export async function fetchMembers(guildId: string): Promise<GuildMember[]> {
  if (!isSupabaseConfigured) {
    return (localMembers()[guildId] ?? []).sort((a, b) => b.weekly_xp - a.weekly_xp);
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('guild_members_view')
    .select('*')
    .eq('guild_id', guildId)
    .order('weekly_xp', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as GuildMember[];
}

export async function setMemberRole(
  guildId: string,
  userId: string,
  role: GuildMember['role'],
): Promise<void> {
  if (!isSupabaseConfigured) {
    const members = localMembers();
    members[guildId] = (members[guildId] ?? []).map((m) =>
      m.user_id === userId ? { ...m, role } : m,
    );
    await writeJson(LOCAL_MEMBERS_KEY, members);
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from('guild_members')
    .update({ role })
    .eq('guild_id', guildId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function kickMember(guildId: string, userId: string): Promise<void> {
  await leaveGuild(guildId, userId);
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export async function fetchMessages(guildId: string): Promise<GuildMessage[]> {
  if (!isSupabaseConfigured) {
    return (localChat()[guildId] ?? []).slice(-GUILD_CHAT_HISTORY);
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('guild_chat')
    .select('*')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(GUILD_CHAT_HISTORY);

  if (error) throw new Error(error.message);
  return ((data ?? []) as GuildMessage[]).reverse();
}

export async function sendMessage(
  guildId: string,
  character: Character,
  body: string,
): Promise<GuildMessage> {
  const message: GuildMessage = {
    id: uid('msg_'),
    guild_id: guildId,
    user_id: character.user_id,
    author_name: character.name,
    avatar_id: character.avatar_id,
    body: body.trim().slice(0, 500),
    created_at: nowTimestamp(),
  };

  if (!isSupabaseConfigured) {
    const chat = localChat();
    chat[guildId] = [...(chat[guildId] ?? []), message].slice(-GUILD_CHAT_HISTORY);
    await writeJson(LOCAL_CHAT_KEY, chat);
    return message;
  }

  const client = requireSupabase();
  const { data, error } = await client.from('guild_chat').insert(message).select().single();
  if (error) throw new Error(error.message);
  return data as GuildMessage;
}

/** Realtime chat subscription. Returns an unsubscribe function. */
export function subscribeToChat(
  guildId: string,
  onMessage: (message: GuildMessage) => void,
): () => void {
  if (!isSupabaseConfigured || !supabase) return () => undefined;

  const client = supabase;
  const channel = client
    .channel(`guild_chat:${guildId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'guild_chat', filter: `guild_id=eq.${guildId}` },
      (payload) => onMessage(payload.new as GuildMessage),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/* ------------------------------------------------------------------ */
/* Quests and wars                                                     */
/* ------------------------------------------------------------------ */

const QUEST_TEMPLATES = [
  { title: 'Collective Fajr', description: 'Guild members log 100 Fajr prayers.', target: 100, reward_coins: 5000 },
  { title: 'Deep Push', description: 'Guild clears 300 monsters this week.', target: 300, reward_coins: 4000 },
  { title: 'Unbroken Chain', description: 'Guild logs 500 habits this week.', target: 500, reward_coins: 6000 },
  { title: 'Hold the Line', description: 'Guild resists 200 bad habits this week.', target: 200, reward_coins: 7000 },
];

export async function fetchQuests(guildId: string): Promise<GuildQuest[]> {
  const week = currentWeekKey();

  if (!isSupabaseConfigured) {
    return QUEST_TEMPLATES.slice(0, 3).map((t, i) => ({
      id: `${guildId}_${week}_${i}`,
      guild_id: guildId,
      week,
      progress: Math.floor(t.target * (0.2 + i * 0.25)),
      ...t,
    }));
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('guild_quests')
    .select('*')
    .eq('guild_id', guildId)
    .eq('week', week);

  if (error) throw new Error(error.message);
  return (data ?? []) as GuildQuest[];
}

export async function fetchWar(guildId: string): Promise<GuildWar | null> {
  const week = currentWeekKey();

  if (!isSupabaseConfigured) {
    const guilds = localGuilds();
    const self = guilds.find((g) => g.id === guildId);
    const opponent = guilds.find((g) => g.id !== guildId);
    if (!self || !opponent) return null;

    const ends = new Date();
    ends.setUTCDate(ends.getUTCDate() + ((8 - ends.getUTCDay()) % 7 || 7));

    return {
      id: `war_${week}_${guildId}`,
      week,
      guild_a: self.id,
      guild_b: opponent.id,
      guild_a_name: self.name,
      guild_b_name: opponent.name,
      guild_a_xp: self.weekly_xp,
      guild_b_xp: opponent.weekly_xp,
      ends_at: ends.toISOString(),
    };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('guild_wars')
    .select('*')
    .eq('week', week)
    .or(`guild_a.eq.${guildId},guild_b.eq.${guildId}`)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as GuildWar) ?? null;
}

export { GUILD_EMBLEMS };
