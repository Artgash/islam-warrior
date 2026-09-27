/**
 * Seven boards. The weekly reset is Monday 00:00 UTC and is shown as a live
 * countdown, because the reset is the point.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Timer, Users } from 'lucide-react';
import type { LeaderboardEntry, LeaderboardType } from '@/types';
import { useGameStore } from '@/state';
import { selectWeeklyXp } from '@/state/selectors';
import { useWeeklyResetCountdown } from '@/hooks/useGame';
import { PageShell } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, Skeleton } from '@/components/ui/misc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/common/Avatar';
import { RankBadge } from '@/components/rank/RankBadge';
import {
  BOARD_DESCRIPTIONS,
  BOARD_LABELS,
  BOARD_UNITS,
  fetchLeaderboard,
} from '@/api/leaderboard';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatClock, smartNumber, ordinal } from '@/lib/format';
import { cn } from '@/lib/utils';

const BOARDS: LeaderboardType[] = [
  'weekly',
  'friends',
  'guild',
  'rank_tier',
  'global',
  'slayers',
  'deep_road',
];

export default function LeaderboardsPage() {
  const character = useGameStore((s) => s.character);
  const weeklyXp = useGameStore(selectWeeklyXp);
  const guildMembers = useGameStore((s) => s.members);
  const countdown = useWeeklyResetCountdown();

  const [board, setBoard] = useState<LeaderboardType>('weekly');

  if (!character) return null;

  return (
    <PageShell title="Leaderboards" subtitle={BOARD_DESCRIPTIONS[board]}>
      {/* Reset clock */}
      <div className="panel mb-4 flex items-center justify-between p-3.5">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-gold" />
          <span className="text-xs text-muted">Weekly reset</span>
        </div>
        <span className="tabular font-display text-lg text-gold">{formatClock(countdown)}</span>
      </div>

      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-lg border border-edge bg-card/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
          <span className="text-gold">Local ladder.</span> These opponents are generated on this
          device so the boards are usable offline. Connect Supabase for real players.
        </p>
      )}

      <Tabs value={board} onValueChange={(v) => setBoard(v as LeaderboardType)}>
        <TabsList>
          {BOARDS.map((b) => (
            <TabsTrigger key={b} value={b}>
              {BOARD_LABELS[b]}
            </TabsTrigger>
          ))}
        </TabsList>

        {BOARDS.map((b) => (
          <TabsContent key={b} value={b}>
            <Board
              type={b}
              weeklyXp={weeklyXp}
              guildMemberIds={guildMembers.map((m) => m.user_id)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

function Board({
  type,
  weeklyXp,
  guildMemberIds,
}: {
  type: LeaderboardType;
  weeklyXp: number;
  guildMemberIds: string[];
}) {
  const character = useGameStore((s) => s.character);

  const query = useQuery({
    queryKey: ['leaderboard', type, character?.user_id, weeklyXp, guildMemberIds.length],
    queryFn: () =>
      fetchLeaderboard({
        type,
        character: character!,
        weeklyXp,
        guildMemberIds,
        friendIds: [],
      }),
    enabled: Boolean(character),
    staleTime: 60_000,
  });

  const entries = query.data ?? [];
  const self = useMemo(() => entries.find((e) => e.is_self), [entries]);
  const selfInView = self ? self.position <= 100 : false;

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        title="Could not load this board"
        description={query.error instanceof Error ? query.error.message : 'Unknown error.'}
        action={
          <Button variant="secondary" onClick={() => query.refetch()}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        }
      />
    );
  }

  if (entries.length <= 1 && (type === 'friends' || type === 'guild')) {
    return (
      <EmptyState
        icon={<Users className="size-9" />}
        title={type === 'friends' ? 'You follow nobody yet' : 'You are not in a guild'}
        description={
          type === 'friends'
            ? 'Follow other warriors and their weekly XP appears here.'
            : 'Join a guild and your brothers appear here, ranked by this week.'
        }
      />
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={cn('size-3.5', query.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <ol className="space-y-1.5">
        {entries.map((entry) => (
          <LeaderRow key={entry.user_id} entry={entry} unit={BOARD_UNITS[type]} />
        ))}
      </ol>

      {/* Sticky self row when outside the visible board */}
      {self && !selfInView && (
        <div className="sticky bottom-20 z-10 mt-3">
          <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-muted">
            Your position
          </p>
          <LeaderRow entry={self} unit={BOARD_UNITS[type]} />
        </div>
      )}
    </>
  );
}

function LeaderRow({ entry, unit }: { entry: LeaderboardEntry; unit: string }) {
  const medal =
    entry.position === 1
      ? 'text-legendary'
      : entry.position === 2
        ? 'text-[#E5E7EB]'
        : entry.position === 3
          ? 'text-[#B45309]'
          : 'text-muted';

  return (
    <li
      className={cn(
        'panel flex items-center gap-3 p-2.5 transition-all',
        entry.is_self && 'border-gold bg-gold/[0.07] shadow-gold',
      )}
    >
      <span
        className={cn('tabular w-8 shrink-0 text-center font-display text-sm', medal)}
        aria-label={`Position ${entry.position}`}
      >
        {entry.position <= 3 ? ordinal(entry.position) : entry.position}
      </span>

      <Avatar avatarId={entry.avatar_id} size={34} ring={entry.is_self} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-display text-sm text-bone">{entry.name}</span>
          {entry.is_self && <Badge variant="gold">You</Badge>}
        </div>
        <p className="text-[11px] text-muted">
          {entry.detail ?? `Level ${entry.level}`}
        </p>
      </div>

      <RankBadge tier={entry.rank_tier} size={24} />

      <div className="shrink-0 text-right">
        <p className="tabular font-display text-sm text-gold">{smartNumber(entry.value)}</p>
        {unit && <p className="text-[9px] uppercase tracking-wider text-muted">{unit}</p>}
      </div>
    </li>
  );
}
