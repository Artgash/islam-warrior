import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Flame,
  Map,
  ShieldHalf,
  ShoppingBag,
  Swords,
  Trophy,
  User,
  Users,
  ListChecks,
  Medal,
} from 'lucide-react';
import { useGameStore } from '@/state';
import { selectUnreadNotifications } from '@/state/selectors';
import { useCombatTotals } from '@/hooks/useGame';
import { Avatar } from '@/components/common/Avatar';
import { RankBadge } from '@/components/rank/RankBadge';
import { HPBar } from '@/components/battle/HPBar';
import { smartNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

export function TopBar() {
  const character = useGameStore((s) => s.character);
  const totals = useCombatTotals();
  const unread = useGameStore(selectUnreadNotifications);

  if (!character) return null;

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-edge bg-night/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2">
        <NavLink to="/character" className="shrink-0" aria-label="Open character sheet">
          <Avatar avatarId={character.avatar_id} size={38} ring />
        </NavLink>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-display text-sm text-bone">{character.name}</span>
            <span className="tabular shrink-0 text-[10px] text-muted">Lv {character.level}</span>
          </div>
          <HPBar
            current={character.hp}
            max={totals?.max_hp ?? character.max_hp}
            showNumbers={false}
            className="mt-0.5"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs" title="Daily streak">
            <Flame className={cn('size-3.5', character.streak > 0 ? 'text-gold' : 'text-muted')} />
            <span className="tabular text-bone">{character.streak}</span>
          </span>

          <span className="flex items-center gap-1 text-xs" title="Coins">
            <span className="text-gold">◎</span>
            <span className="tabular text-bone">{smartNumber(character.coins)}</span>
          </span>

          <NavLink
            to="/rank"
            aria-label={`Rank: tier ${character.rank_tier}`}
            className="transition-transform hover:scale-110"
          >
            <RankBadge tier={character.rank_tier} division={character.rank_division} size={28} />
          </NavLink>

          <NavLink to="/profile" className="relative" aria-label="Notifications">
            <Bell className="size-4 text-muted transition-colors hover:text-bone" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-bone">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom navigation                                                   */
/* ------------------------------------------------------------------ */

const PRIMARY_NAV = [
  { to: '/', label: 'Battle', icon: Swords, end: true },
  { to: '/road', label: 'Road', icon: Map, end: false },
  { to: '/habits', label: 'Habits', icon: ListChecks, end: false },
  { to: '/leaderboards', label: 'Boards', icon: Trophy, end: false },
  { to: '/shop', label: 'Shop', icon: ShoppingBag, end: false },
  { to: '/more', label: 'More', icon: User, end: false },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-night/92 backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-2xl items-stretch">
        {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => {
          const active = end ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2.5"
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-gold"
                />
              )}
              <Icon
                className={cn(
                  'size-[18px] shrink-0 transition-colors',
                  active ? 'text-gold' : 'text-muted',
                )}
              />
              <span
                className={cn(
                  'w-full truncate text-center font-display text-[9px] uppercase tracking-wide transition-colors',
                  active ? 'text-gold' : 'text-muted',
                )}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Secondary nav (the "More" hub)                                      */
/* ------------------------------------------------------------------ */

export const SECONDARY_NAV = [
  { to: '/character', label: 'Character', icon: ShieldHalf, description: 'Stats, gear and titles' },
  { to: '/rank', label: 'Rank', icon: Medal, description: 'The ten-tier ladder' },
  { to: '/guild', label: 'Guild', icon: Users, description: 'Brotherhood, chat and wars' },
  { to: '/iblis', label: 'Iblis', icon: Flame, description: 'Every word he has said to you' },
  { to: '/season', label: 'Season', icon: Map, description: 'The pass and the current season' },
  { to: '/profile', label: 'Profile', icon: User, description: 'Achievements and history' },
];

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

export function PageShell({
  title,
  subtitle,
  children,
  action,
  wide = false,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full px-3 pb-24 pt-3', wide ? 'max-w-4xl' : 'max-w-2xl')}>
      {title && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl text-bone">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
