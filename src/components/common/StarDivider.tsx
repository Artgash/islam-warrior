import { cn } from '@/lib/utils';

/** The eight-point star used as a section divider throughout the app. */
export function EightPointStar({
  size = 16,
  className,
  filled = false,
}: {
  size?: number;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <path
        d="M30 2 L37 23 L58 30 L37 37 L30 58 L23 37 L2 30 L23 23 Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 3}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarDivider({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 py-2 text-gold/50', className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/40" />
      <EightPointStar size={14} />
      {label && (
        <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted">
          {label}
        </span>
      )}
      {label && <EightPointStar size={14} />}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/40" />
    </div>
  );
}

/** A repeating geometric field used behind hero sections. */
export function GeometricField({ className }: { className?: string }) {
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]', className)}
      aria-hidden="true"
    >
      <defs>
        <pattern id="iw-geo" width="80" height="80" patternUnits="userSpaceOnUse">
          <path
            d="M40 4 L49 31 L76 40 L49 49 L40 76 L31 49 L4 40 L31 31 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx="40" cy="40" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#iw-geo)" />
    </svg>
  );
}

/** Arabesque corner frame, drawn around legendary cards. */
export function ArabesqueFrame({ className }: { className?: string }) {
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      aria-hidden="true"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        d="M2 12 Q2 2 12 2 M88 2 Q98 2 98 12 M98 88 Q98 98 88 98 M12 98 Q2 98 2 88"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
