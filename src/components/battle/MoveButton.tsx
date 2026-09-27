import { motion } from 'framer-motion';
import { Check, Shield, Zap } from 'lucide-react';
import type { Habit, HabitCategory } from '@/types';
import { intensityLabel } from '@/game/habits/intensity';
import { smartNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export const CATEGORY_COLORS: Record<HabitCategory, string> = {
  faith: '#22C55E',
  intelligence: '#3B82F6',
  strength: '#DC2626',
  charisma: '#D4AF37',
  discipline: '#A855F7',
  bad_habit: '#64748B',
};

export const CATEGORY_LABELS: Record<HabitCategory, string> = {
  faith: 'Faith',
  intelligence: 'Intelligence',
  strength: 'Strength',
  charisma: 'Charisma',
  discipline: 'Discipline',
  bad_habit: 'Resistance',
};

/** Intensity rendered as filled pips rather than stars — reads faster. */
export function IntensityPips({ value, color }: { value: number; color?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Intensity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="h-1 w-2.5 rounded-full transition-colors"
          style={{ backgroundColor: i <= value ? (color ?? '#D4AF37') : '#2A3348' }}
        />
      ))}
    </span>
  );
}

export interface MoveButtonProps {
  habit: Habit;
  completed: boolean;
  /** Estimated damage, shown so the player can pick their strike. */
  estimatedDamage: number;
  disabled?: boolean;
  onPress: (habit: Habit) => void;
}

export function MoveButton({
  habit,
  completed,
  estimatedDamage,
  disabled = false,
  onPress,
}: MoveButtonProps) {
  const color = CATEGORY_COLORS[habit.category];
  const isResistance = habit.category === 'bad_habit';

  return (
    <motion.button
      type="button"
      whileTap={completed || disabled ? undefined : { scale: 0.96 }}
      onClick={() => onPress(habit)}
      disabled={completed || disabled}
      aria-label={`${habit.name}. ${intensityLabel(habit.intensity)}. ${
        completed ? 'Already completed today' : `About ${estimatedDamage} damage`
      }`}
      className={cn(
        'panel group relative flex min-h-[86px] flex-col justify-between overflow-hidden p-2.5 text-left transition-all',
        completed
          ? 'opacity-45'
          : disabled
            ? 'cursor-not-allowed opacity-40'
            : 'hover:border-gold/50 hover:shadow-gold active:scale-[0.98]',
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* Category wash */}
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.07] transition-opacity group-hover:opacity-[0.14]"
        style={{ background: `radial-gradient(circle at 20% 0%, ${color}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-1.5">
        <span className="line-clamp-2 font-display text-[13px] leading-tight text-bone">
          {habit.name}
        </span>
        {completed ? (
          <Check className="size-4 shrink-0 text-emerald" />
        ) : isResistance ? (
          <Shield className="size-3.5 shrink-0" style={{ color }} />
        ) : (
          <Zap className="size-3.5 shrink-0" style={{ color }} />
        )}
      </div>

      <div className="relative mt-2 space-y-1.5">
        <IntensityPips value={habit.intensity} color={color} />
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {isResistance ? 'Resist' : intensityLabel(habit.intensity)}
          </span>
          {!completed && (
            <span className="tabular text-[11px] font-semibold text-gold">
              {smartNumber(estimatedDamage)}
            </span>
          )}
        </div>
      </div>

      {habit.streak > 0 && !completed && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-night/80 px-1.5 text-[9px] text-gold">
          {habit.streak}d
        </span>
      )}
    </motion.button>
  );
}
