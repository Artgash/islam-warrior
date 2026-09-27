/**
 * Guilds: browse, create, join, chat, quests and the weekly war.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Crown, Lock, LogOut, Search, Send, Shield, Swords, Target } from 'lucide-react';
import type { Guild, GuildMember } from '@/types';
import { useGameStore } from '@/state';
import { PageShell } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, FieldError } from '@/components/ui/input';
import { Badge, EmptyState, Progress, Skeleton } from '@/components/ui/misc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar } from '@/components/common/Avatar';
import { RankBadge } from '@/components/rank/RankBadge';
import { StarDivider } from '@/components/common/StarDivider';
import {
  GUILD_EMBLEMS,
  GUILD_RANK_COLORS,
  browseGuilds,
  createGuild,
  fetchMembers,
  fetchMessages,
  fetchQuests,
  fetchWar,
  joinGuild,
  leaveGuild,
  sendMessage,
  subscribeToChat,
} from '@/api/guild';
import { canCreateGuild, hasGuildAccess } from '@/game/ranks/rankLogic';
import { GUILD_MAX_MEMBERS } from '@/game/constants';
import { relative, formatDay } from '@/lib/date';
import { smartNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function GuildPage() {
  const character = useGameStore((s) => s.character);
  const guild = useGameStore((s) => s.guild);

  if (!character) return null;

  if (!hasGuildAccess(character.rank_tier)) {
    return (
      <PageShell title="Guild">
        <EmptyState
          icon={<Lock className="size-10" />}
          title="Guilds open at Mujahid"
          description="Reach rank tier 3 and the brotherhood opens to you. Nobody walks 66 zones alone."
        />
      </PageShell>
    );
  }

  return guild ? <GuildHome guild={guild} /> : <GuildBrowser />;
}

/* ------------------------------------------------------------------ */
/* Browser                                                             */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name: z.string().min(3, 'At least 3 characters.').max(30, 'At most 30 characters.'),
  tag: z.string().min(2, 'At least 2 characters.').max(5, 'At most 5 characters.'),
  description: z.string().max(200, 'At most 200 characters.'),
});

function GuildBrowser() {
  const character = useGameStore((s) => s.character)!;
  const setGuild = useGameStore((s) => s.setGuild);
  const setMembers = useGameStore((s) => s.setMembers);

  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [emblem, setEmblem] = useState<string>(GUILD_EMBLEMS[0].id);

  const query = useQuery({
    queryKey: ['guilds', search],
    queryFn: () => browseGuilds(search),
    staleTime: 30_000,
  });

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', tag: '', description: '' },
  });

  const onJoin = async (guild: Guild) => {
    if (guild.member_count >= GUILD_MAX_MEMBERS) {
      toast.error('That guild is full.');
      return;
    }
    await joinGuild(guild.id, character);
    setGuild(guild);
    setMembers(await fetchMembers(guild.id));
    toast.success(`You joined ${guild.name}.`);
  };

  const onCreate = form.handleSubmit(async (values) => {
    const guild = await createGuild({ ...values, emblem_id: emblem, character });
    setGuild(guild);
    setMembers(await fetchMembers(guild.id));
    setCreating(false);
    toast.success(`${guild.name} founded.`);
  });

  return (
    <PageShell
      title="Guilds"
      subtitle="Find your brothers, or found your own."
      action={
        canCreateGuild(character.rank_tier) ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            Create
          </Button>
        ) : undefined
      }
    >
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or tag"
          className="pl-9"
          aria-label="Search guilds"
        />
      </div>

      {!canCreateGuild(character.rank_tier) && (
        <p className="mb-4 rounded-lg border border-edge bg-card/60 px-3 py-2 text-[11px] text-muted">
          Founding a guild requires rank tier 7 (Qa'id). You can join one at any rank from Mujahid.
        </p>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState title="No guilds found" description="Try a different search." />
      ) : (
        <div className="space-y-2">
          {(query.data ?? []).map((guild) => (
            <div key={guild.id} className="panel p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-display text-base text-bone">{guild.name}</h3>
                    <Badge>[{guild.tag}]</Badge>
                    <Badge
                      style={{
                        color: GUILD_RANK_COLORS[guild.rank],
                        borderColor: `${GUILD_RANK_COLORS[guild.rank]}66`,
                      }}
                    >
                      {guild.rank}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{guild.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="stat-chip">
                      {guild.member_count}/{GUILD_MAX_MEMBERS} members
                    </span>
                    <span className="stat-chip text-gold">
                      {smartNumber(guild.weekly_xp)} XP this week
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => onJoin(guild)}
                  disabled={guild.member_count >= GUILD_MAX_MEMBERS}
                >
                  {guild.member_count >= GUILD_MAX_MEMBERS ? 'Full' : 'Join'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Found a guild</DialogTitle>
            <DialogDescription>
              You become its leader. Up to {GUILD_MAX_MEMBERS} warriors can stand with you.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onCreate} className="space-y-3">
            <div>
              <Label htmlFor="guild-name">Name</Label>
              <Input id="guild-name" {...form.register('name')} placeholder="Companions of Badr" />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="guild-tag">Tag</Label>
              <Input
                id="guild-tag"
                {...form.register('tag')}
                placeholder="BADR"
                maxLength={5}
                className="max-w-[120px] uppercase"
              />
              <FieldError>{form.formState.errors.tag?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="guild-desc">Description</Label>
              <Textarea
                id="guild-desc"
                rows={2}
                {...form.register('description')}
                placeholder="What this guild expects of its members."
              />
              <FieldError>{form.formState.errors.description?.message}</FieldError>
            </div>

            <div>
              <Label>Emblem</Label>
              <div className="grid grid-cols-4 gap-2">
                {GUILD_EMBLEMS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEmblem(e.id)}
                    aria-pressed={emblem === e.id}
                    className={cn(
                      'rounded-lg border p-2 text-[10px] transition-all',
                      emblem === e.id
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-edge text-muted hover:border-gold/40',
                    )}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Found it</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Guild home                                                          */
/* ------------------------------------------------------------------ */

function GuildHome({ guild }: { guild: Guild }) {
  const character = useGameStore((s) => s.character)!;
  const members = useGameStore((s) => s.members);
  const setMembers = useGameStore((s) => s.setMembers);
  const leaveCurrentGuild = useGameStore((s) => s.leaveCurrentGuild);
  const queryClient = useQueryClient();

  const [confirmLeave, setConfirmLeave] = useState(false);

  const membersQuery = useQuery({
    queryKey: ['guild-members', guild.id],
    queryFn: () => fetchMembers(guild.id),
  });

  const questsQuery = useQuery({
    queryKey: ['guild-quests', guild.id],
    queryFn: () => fetchQuests(guild.id),
  });

  const warQuery = useQuery({
    queryKey: ['guild-war', guild.id],
    queryFn: () => fetchWar(guild.id),
  });

  useEffect(() => {
    if (membersQuery.data) setMembers(membersQuery.data);
  }, [membersQuery.data, setMembers]);

  const isLeader = guild.leader_id === character.user_id;

  const onLeave = async () => {
    await leaveGuild(guild.id, character.user_id);
    leaveCurrentGuild();
    queryClient.invalidateQueries({ queryKey: ['guilds'] });
    setConfirmLeave(false);
  };

  return (
    <PageShell title={guild.name} subtitle={guild.description}>
      {/* Banner */}
      <div className="panel framed p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>[{guild.tag}]</Badge>
              <Badge
                style={{
                  color: GUILD_RANK_COLORS[guild.rank],
                  borderColor: `${GUILD_RANK_COLORS[guild.rank]}66`,
                }}
              >
                {guild.rank} Guild
              </Badge>
              {isLeader && (
                <Badge variant="gold">
                  <Crown className="size-2.5" />
                  Leader
                </Badge>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Members" value={`${members.length || guild.member_count}`} />
              <Stat label="Weekly XP" value={smartNumber(guild.weekly_xp)} />
              <Stat label="Total XP" value={smartNumber(guild.total_xp)} />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="chat" className="mt-4">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="quests">Quests</TabsTrigger>
          <TabsTrigger value="war">War</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ChatBox guildId={guild.id} />
        </TabsContent>

        <TabsContent value="members">
          <MemberList members={members} isLeader={isLeader} guildId={guild.id} />
        </TabsContent>

        <TabsContent value="quests">
          {(questsQuery.data ?? []).length === 0 ? (
            <EmptyState title="No quests this week" description="New collective goals post on Monday." />
          ) : (
            <div className="space-y-2">
              {(questsQuery.data ?? []).map((quest) => {
                const ratio = Math.min(1, quest.progress / quest.target);
                return (
                  <div key={quest.id} className="panel p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Target className="size-3.5 shrink-0 text-gold" />
                          <h3 className="truncate font-display text-sm text-bone">{quest.title}</h3>
                        </div>
                        <p className="mt-1 text-xs text-muted">{quest.description}</p>
                      </div>
                      <span className="tabular shrink-0 text-xs text-gold">
                        +{smartNumber(quest.reward_coins)}
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <Progress value={ratio} height="h-1.5" />
                      <p className="mt-1 flex justify-between text-[11px] text-muted">
                        <span>
                          {smartNumber(quest.progress)} / {smartNumber(quest.target)}
                        </span>
                        <span>{formatPercent(ratio)}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="war">
          {warQuery.data ? (
            <WarPanel
              war={warQuery.data}
              ourId={guild.id}
            />
          ) : (
            <EmptyState
              icon={<Swords className="size-9" />}
              title="No war this week"
              description="Matchmaking runs every Monday between guilds of similar rank."
            />
          )}
        </TabsContent>
      </Tabs>

      <StarDivider className="mt-6" />

      <Button variant="ghost" size="block" onClick={() => setConfirmLeave(true)}>
        <LogOut className="size-4" />
        Leave guild
      </Button>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave {guild.name}?</DialogTitle>
            <DialogDescription>
              Your own progress, gear and rank are untouched. You can join another guild
              immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)}>
              Stay
            </Button>
            <Button variant="danger" onClick={onLeave}>
              Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

function ChatBox({ guildId }: { guildId: string }) {
  const character = useGameStore((s) => s.character)!;
  const messages = useGameStore((s) => s.messages);
  const setMessages = useGameStore((s) => s.setMessages);
  const appendMessage = useGameStore((s) => s.appendMessage);

  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchMessages(guildId).then(setMessages);
    return subscribeToChat(guildId, appendMessage);
  }, [guildId, setMessages, appendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    const message = await sendMessage(guildId, character, body);
    appendMessage(message);
  };

  return (
    <div className="panel flex h-[55vh] flex-col p-0">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            Nothing said yet. Say something worth saying.
          </p>
        )}

        {messages.map((message) => {
          const mine = message.user_id === character.user_id;
          return (
            <div key={message.id} className={cn('flex gap-2', mine && 'flex-row-reverse')}>
              <Avatar avatarId={message.avatar_id} size={28} />
              <div className={cn('max-w-[75%]', mine && 'text-right')}>
                <div
                  className={cn(
                    'flex items-baseline gap-2 text-[10px] text-muted',
                    mine && 'flex-row-reverse',
                  )}
                >
                  <span>{message.author_name}</span>
                  <span>{relative(message.created_at)}</span>
                </div>
                <div
                  className={cn(
                    'mt-0.5 inline-block rounded-lg border px-3 py-1.5 text-sm',
                    mine
                      ? 'border-gold/40 bg-gold/10 text-bone'
                      : 'border-edge bg-night/60 text-bone',
                  )}
                >
                  {message.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-2 border-t border-edge p-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something"
          maxLength={500}
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

function MemberList({
  members,
  isLeader,
  guildId,
}: {
  members: GuildMember[];
  isLeader: boolean;
  guildId: string;
}) {
  const character = useGameStore((s) => s.character)!;
  const setMembers = useGameStore((s) => s.setMembers);

  if (members.length === 0) {
    return <EmptyState title="Just you so far" description="Invite others by sharing the guild name." />;
  }

  return (
    <div className="space-y-1.5">
      {members.map((member) => (
        <div key={member.user_id} className="panel flex items-center gap-3 p-2.5">
          <Avatar avatarId={member.avatar_id} size={34} ring={member.user_id === character.user_id} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="truncate font-display text-sm text-bone">{member.name}</span>
              {member.role === 'leader' && (
                <Badge variant="gold">
                  <Crown className="size-2.5" />
                  Leader
                </Badge>
              )}
              {member.role === 'officer' && (
                <Badge>
                  <Shield className="size-2.5" />
                  Officer
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted">
              {smartNumber(member.weekly_xp)} XP this week · last seen{' '}
              {formatDay(member.last_active)}
            </p>
          </div>

          <RankBadge tier={member.rank_tier} size={24} />

          {isLeader && member.user_id !== character.user_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const { kickMember } = await import('@/api/guild');
                await kickMember(guildId, member.user_id);
                const { fetchMembers: refetch } = await import('@/api/guild');
                setMembers(await refetch(guildId));
                toast.success(`${member.name} removed.`);
              }}
            >
              Kick
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* War                                                                 */
/* ------------------------------------------------------------------ */

function WarPanel({
  war,
  ourId,
}: {
  war: NonNullable<Awaited<ReturnType<typeof fetchWar>>>;
  ourId: string;
}) {
  const weAreA = war.guild_a === ourId;
  const ourXp = weAreA ? war.guild_a_xp : war.guild_b_xp;
  const theirXp = weAreA ? war.guild_b_xp : war.guild_a_xp;
  const ourName = weAreA ? war.guild_a_name : war.guild_b_name;
  const theirName = weAreA ? war.guild_b_name : war.guild_a_name;

  const total = ourXp + theirXp || 1;
  const share = ourXp / total;
  const winning = ourXp > theirXp;

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="heading-rule">Week {war.week}</span>
        <Badge variant={winning ? 'emerald' : 'danger'}>{winning ? 'Winning' : 'Behind'}</Badge>
      </div>

      <div className="flex items-baseline justify-between text-sm">
        <span className="truncate font-display text-bone">{ourName}</span>
        <span className="truncate font-display text-muted">{theirName}</span>
      </div>

      <div className="my-2 flex h-3 overflow-hidden rounded-full border border-edge">
        <div
          className="bg-gradient-to-r from-emerald to-gold transition-all duration-500"
          style={{ width: `${share * 100}%` }}
        />
        <div className="flex-1 bg-crimson/70" />
      </div>

      <div className="flex items-baseline justify-between text-xs">
        <span className="tabular text-emerald">{smartNumber(ourXp)} XP</span>
        <span className="tabular text-danger">{smartNumber(theirXp)} XP</span>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Ends {new Date(war.ends_at).toLocaleDateString()} · every habit your guild logs counts
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-inset p-2 text-center">
      <p className="tabular font-display text-sm text-gold">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
