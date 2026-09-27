/**
 * Profile: lifetime statistics, the achievement grid, badges, monthly relics
 * and the notification history.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Settings as SettingsIcon, Sparkles, Trophy } from 'lucide-react';
import type { AchievementContext } from '@/types';
import { useGameStore } from '@/state';
import { selectAnsweredTauntCount } from '@/state/selectors';
import { PageShell } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, Progress } from '@/components/ui/misc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/common/Avatar';
import { RankBadge } from '@/components/rank/RankBadge';
import { StarDivider } from '@/components/common/StarDivider';
import {
  ACHIEVEMENTS,
  TOTAL_ACHIEVEMENTS,
  progressFor,
  progressRatio,
} from '@/game/achievements/checkers';
import {
  countPerfectMonths,
  countPerfectWeeks,
  daysActive,
  resistanceStreak,
} from '@/game/habits/streaks';
import { RARITY_COLORS, getGear } from '@/game/shop/gearStats';
import { divisionLabel } from '@/game/ranks/rankLogic';
import { today as todayISO, relative } from '@/lib/date';
import { smartNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const character = useGameStore((s) => s.character);
  const habits = useGameStore((s) => s.habits);
  const logs = useGameStore((s) => s.logs);
  const unlocked = useGameStore((s) => s.achievements);
  const inventory = useGameStore((s) => s.inventory);
  const notifications = useGameStore((s) => s.notifications);
  const markRead = useGameStore((s) => s.markNotificationRead);
  const guildMembers = useGameStore((s) => s.members);
  const iblisReplies = useGameStore(selectAnsweredTauntCount);

  const date = todayISO();

  const context: AchievementContext | null = useMemo(() => {
    if (!character) return null;
    return {
      character,
      perfect_weeks: countPerfectWeeks(habits, logs, date),
      perfect_months: countPerfectMonths(habits, logs, date),
      resistance_streak: resistanceStreak(logs, date),
      guild_contribution:
        guildMembers.find((m) => m.user_id === character.user_id)?.total_xp ?? 0,
      iblis_replies: iblisReplies,
    };
  }, [character, habits, logs, date, guildMembers, iblisReplies]);

  if (!character || !context) return null;

  const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));
  const visible = ACHIEVEMENTS.filter((a) => !a.secret || unlockedIds.has(a.id));
  const secretsRemaining = ACHIEVEMENTS.filter((a) => a.secret && !unlockedIds.has(a.id)).length;

  const relics = inventory
    .map((e) => ({ entry: e, item: getGear(e.item_id) }))
    .filter((r) => r.item?.is_award_only);

  return (
    <PageShell
      title="Profile"
      action={
        <Link to="/settings">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <SettingsIcon className="size-4" />
          </Button>
        </Link>
      }
    >
      {/* Identity */}
      <div className="panel framed flex items-center gap-4 p-4">
        <Avatar avatarId={character.avatar_id} size={64} ring />

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl text-bone">{character.name}</h2>
          {character.title && (
            <p className="truncate text-sm text-gold">{character.title}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <RankBadge tier={character.rank_tier} size={22} />
            <span className="text-xs text-muted">
              Level {character.level} · {smartNumber(character.total_xp_earned)} lifetime XP
            </span>
          </div>
        </div>
      </div>

      {/* Lifetime numbers */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Monsters slain" value={smartNumber(character.total_monsters_killed)} />
        <Stat label="Bosses felled" value={smartNumber(character.total_bosses_killed)} />
        <Stat label="Habits kept" value={smartNumber(character.total_habits_completed)} />
        <Stat label="Days active" value={smartNumber(daysActive(logs))} />
        <Stat label="Longest streak" value={`${character.longest_streak}d`} />
        <Stat label="Current streak" value={`${character.streak}d`} />
        <Stat label="Coins earned" value={smartNumber(character.total_coins_earned)} />
        <Stat label="Deepest zone" value={`Zone ${character.current_zone}`} />
      </div>

      <Tabs defaultValue="achievements" className="mt-5">
        <TabsList>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="relics">Relics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Achievements ---------------------------------------------- */}
        <TabsContent value="achievements">
          <div className="panel mb-4 p-3">
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-muted">Unlocked</span>
              <span className="tabular text-gold">
                {unlocked.length} / {TOTAL_ACHIEVEMENTS}
              </span>
            </div>
            <Progress value={unlocked.length / TOTAL_ACHIEVEMENTS} />
            {secretsRemaining > 0 && (
              <p className="mt-2 text-[11px] text-muted">
                {secretsRemaining} secret achievement{secretsRemaining === 1 ? '' : 's'} still
                hidden.
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {visible.map((achievement) => {
              const done = unlockedIds.has(achievement.id);
              const ratio = progressRatio(achievement, context);
              const current = progressFor(achievement, context);
              const color = RARITY_COLORS[achievement.rarity];

              return (
                <div
                  key={achievement.id}
                  className={cn('panel p-3', !done && 'opacity-70')}
                  style={done ? { borderColor: `${color}66` } : undefined}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
                      style={{
                        borderColor: done ? color : '#2A3348',
                        backgroundColor: done ? `${color}1A` : 'transparent',
                      }}
                    >
                      {done ? (
                        <Trophy className="size-4" style={{ color }} />
                      ) : (
                        <Lock className="size-3.5 text-muted/50" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <p className="truncate font-display text-sm text-bone">
                          {achievement.name}
                        </p>
                        <Badge
                          style={{ color, borderColor: `${color}66` }}
                        >
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{achievement.description}</p>

                      {!done && (
                        <div className="mt-2">
                          <Progress value={ratio} height="h-1" />
                          <p className="tabular mt-1 text-[10px] text-muted">
                            {smartNumber(current)} / {smartNumber(achievement.target)}
                          </p>
                        </div>
                      )}

                      {done && (
                        <p className="mt-1 text-[10px] text-gold">
                          +{smartNumber(achievement.reward_coins)} coins claimed
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Relics ----------------------------------------------------- */}
        <TabsContent value="relics">
          {relics.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="size-9" />}
              title="No awarded relics yet"
              description="Monthly relics are given to the top warriors and never re-released. Ramadan, Muharram, Arafah, Laylat al-Qadr and Eid."
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {relics.map(({ entry, item }) => (
                <div key={entry.item_id} className="panel framed foil-border p-3.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 shrink-0 text-legendary" />
                    <p className="foil font-display text-sm">{item!.name}</p>
                  </div>
                  {item!.arabic && (
                    <p className="mt-0.5 font-arabic text-xs text-muted">{item!.arabic}</p>
                  )}
                  <p className="mt-1.5 text-xs text-muted">{item!.description}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-legendary">
                    Awarded · {entry.awarded_label ?? item!.awarded_label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activity --------------------------------------------------- */}
        <TabsContent value="activity">
          {notifications.length === 0 ? (
            <EmptyState title="Nothing yet" description="Level-ups, rank changes and rewards land here." />
          ) : (
            <div className="space-y-1.5">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'panel w-full p-3 text-left transition-all',
                    !n.read && 'border-gold/40',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-display text-sm text-bone">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted">
                      {relative(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <StarDivider className="mt-6" />

      <p className="text-center text-xs text-muted">
        {character.name} · {divisionLabel(character.rank_division)} division ·{' '}
        {formatPercent(unlocked.length / TOTAL_ACHIEVEMENTS)} complete
      </p>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-2.5 text-center">
      <p className="tabular font-display text-base text-gold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
