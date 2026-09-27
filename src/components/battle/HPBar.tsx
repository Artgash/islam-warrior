import { motion } from 'framer-motion';
import { smartNumber, hpPercent, abbreviate } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface HPBarProps {
  current: number;
  max: number;
  /** Exact max where the float cannot hold it (Iblis). Display only. */
  maxExact?: string;
  label?: string;
  variant?: 'player' | 'monster' | 'boss';
  showNumbers?: boolean;
  className?: string;
}

export function HPBar({
  current,
  max,
  maxExact,
  label,
  variant = 'player',
  showNumbers = true,
  className,
}: HPBarProps) {
  const pct = hpPercent(current, max);

  // The bar shifts from its own colour into red as things get desperate.
  const fill =
    variant === 'player'
      ? pct > 50
        ? 'bg-emerald'
        : pct > 25
          ? 'bg-gold'
          : 'bg-danger'
      : variant === 'boss'
        ? 'bg-gradient-to-r from-crimson to-danger'
        : 'bg-gradient-to-r from-[#7C3AED] to-crimson';

  return (
    <div className={cn('w-full', className)}>
      {(label || showNumbers) && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          {label && (
            <span className="truncate font-display text-xs uppercase tracking-wider text-muted">
              {label}
            </span>
          )}
          {showNumbers && (
            <span className="tabular shrink-0 text-xs text-bone/80">
              {smartNumber(current)}{' '}
              <span className="text-muted">
                / {maxExact ? abbreviate(Number(maxExact)) : smartNumber(max)}
              </span>
            </span>
          )}
        </div>
      )}

      <div
        className="hp-bar"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label} health` : 'Health'}
      >
        <motion.div
          className={cn('hp-fill', fill)}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* A faint sheen so the bar does not read as flat. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bone/15 to-transparent" />
      </div>
    </div>
  );
}

/** Damage number that floats up and fades. */
export function FloatingDamage({
  amount,
  crit,
  keyId,
}: {
  amount: number;
  crit: boolean;
  keyId: number;
}) {
  return (
    <motion.span
      key={keyId}
      initial={{ opacity: 0, y: 0, scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], y: -70, scale: crit ? [0.8, 1.4, 1.2] : [0.8, 1.15, 1] }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
      className={cn(
        'tabular pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-shadow-deep',
        crit ? 'text-3xl font-bold text-legendary' : 'text-2xl font-semibold text-bone',
      )}
    >
      {crit && <span className="mr-1 text-base">CRIT</span>}
      {smartNumber(amount)}
    </motion.span>
  );
}
