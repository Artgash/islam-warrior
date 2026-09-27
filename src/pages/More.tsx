import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useGameStore } from '@/state';
import { useRankState, useUnansweredTaunts } from '@/hooks/useGame';
import { PageShell, SECONDARY_NAV } from '@/components/common/Layout';
import { Badge } from '@/components/ui/misc';
import { Avatar } from '@/components/common/Avatar';
import { RankBadge } from '@/components/rank/RankBadge';
import { StarDivider } from '@/components/common/StarDivider';
import { divisionLabel } from '@/game/ranks/rankLogic';
import { smartNumber } from '@/lib/format';

export default function MorePage() {
  const character = useGameStore((s) => s.character);
  const rank = useRankState();
  const unanswered = useUnansweredTaunts();
  const guild = useGameStore((s) => s.guild);

  if (!character || !rank) return null;

  return (
    <PageShell title="More">
      {/* Identity card */}
      <Link to="/character" className="panel framed flex items-center gap-3 p-4 transition-all hover:border-gold/50">
        <Avatar avatarId={character.avatar_id} size={54} ring />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg text-bone">{character.name}</p>
          <p className="truncate text-xs text-gold">{character.title ?? 'No title'}</p>
          <div className="mt-1 flex items-center gap-2">
            <RankBadge tier={rank.tier} size={20} />
            <span className="text-[11px] text-muted">
              {rank.def.name} {divisionLabel(rank.division)} · Level {character.level}
            </span>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </Link>

      {/* Quick numbers */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Zone" value={String(character.current_zone)} />
        <Stat label="Streak" value={`${character.streak}d`} />
        <Stat label="Coins" value={smartNumber(character.coins)} />
      </div>

      <StarDivider className="mt-5" />

      <nav className="space-y-1.5">
        {SECONDARY_NAV.map(({ to, label, icon: Icon, description }) => (
          <Link
            key={to}
            to={to}
            className="panel flex items-center gap-3 p-3.5 transition-all hover:border-gold/50"
          >
            <Icon className="size-5 shrink-0 text-gold" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display text-sm text-bone">{label}</p>
                {to === '/iblis' && unanswered.length > 0 && (
                  <Badge variant="iblis">{unanswered.length} unanswered</Badge>
                )}
                {to === '/guild' && guild && <Badge variant="gold">{guild.tag}</Badge>}
              </div>
              <p className="text-[11px] text-muted">{description}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </Link>
        ))}

        <Link
          to="/settings"
          className="panel flex items-center gap-3 p-3.5 transition-all hover:border-gold/50"
        >
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm text-bone">Settings</p>
            <p className="text-[11px] text-muted">Account, notifications, sound</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted" />
        </Link>
      </nav>

      <p className="mt-8 text-center text-[10px] leading-relaxed text-muted/60">
        ISLAM WARRIOR · 66 zones · jihad al-nafs
        <br />
        Your habits are the weapon. Nothing here replaces the real thing.
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
