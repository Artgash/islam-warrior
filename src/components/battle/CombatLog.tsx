import { AnimatePresence, motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';
import type { CombatEvent, CombatEventType } from '@/types';
import { formatTime } from '@/lib/date';
import { cn } from '@/lib/utils';

const EVENT_COLORS: Record<CombatEventType, string> = {
  player_hit: 'text-bone',
  player_crit: 'text-legendary',
  monster_hit: 'text-danger',
  monster_dodge: 'text-muted',
  player_dodge: 'text-emerald',
  monster_death: 'text-gold',
  player_fallen: 'text-danger',
  level_up: 'text-legendary',
  rank_up: 'text-gold',
  zone_cleared: 'text-emerald',
  loot: 'text-[#A855F7]',
  system: 'text-muted',
};

export function CombatLog({
  events,
  limit = 5,
  className,
}: {
  events: CombatEvent[];
  limit?: number;
  className?: string;
}) {
  const visible = events.slice(0, limit);

  return (
    <div className={cn('panel-inset px-3 py-2', className)}>
      <div className="mb-1.5 flex items-center gap-1.5 text-muted">
        <ScrollText className="size-3" />
        <span className="font-display text-[10px] uppercase tracking-[0.2em]">Combat log</span>
      </div>

      <ul className="space-y-1 text-xs" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.length === 0 && (
            <li className="py-1 text-muted/60">
              The monster waits. Complete a habit to strike.
            </li>
          )}
          {visible.map((event) => (
            <motion.li
              key={event.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-baseline gap-2"
            >
              <span className="tabular shrink-0 text-[10px] text-muted/50">
                {formatTime(event.at)}
              </span>
              <span className={cn('leading-snug', EVENT_COLORS[event.type])}>{event.message}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
