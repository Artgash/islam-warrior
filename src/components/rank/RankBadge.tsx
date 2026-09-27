/**
 * The ten rank badges, drawn as inline SVG so they scale cleanly, theme
 * themselves from the rank's colour, and need no asset pipeline.
 *
 *  1 Muhajir        seed sprouting
 *  2 Talib          open book + small sword
 *  3 Mujahid        two crossed swords
 *  4 Sabir          flame held in a palm
 *  5 Muqatil        a single glowing sword
 *  6 Farsan         horse + lance silhouette
 *  7 Qa'id          lion crest
 *  8 Sultan al-Nafs crown over a seated figure
 *  9 Wali           Kaaba silhouette with a radiant glow
 * 10 Khalifa        crescent throne with rays
 */

import { getRankDef, divisionLabel } from '@/game/ranks/rankLogic';
import { cn } from '@/lib/utils';

interface GlyphProps {
  color: string;
  accent: string;
}

const Muhajir = ({ color, accent }: GlyphProps) => (
  <g>
    <path d="M32 46 L32 30" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M32 32 Q22 28 20 18 Q31 18 32 30 Z" fill={accent} opacity="0.9" />
    <path d="M32 36 Q42 32 44 22 Q33 22 32 34 Z" fill={color} />
    <path d="M24 48 L40 48" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </g>
);

const Talib = ({ color, accent }: GlyphProps) => (
  <g>
    <path d="M14 22 Q24 18 32 22 L32 44 Q24 40 14 44 Z" fill={color} opacity="0.85" />
    <path d="M50 22 Q40 18 32 22 L32 44 Q40 40 50 44 Z" fill={color} opacity="0.55" />
    <path d="M32 20 L32 46" stroke={accent} strokeWidth="1.5" />
    <path d="M40 14 L46 8 L48 10 L42 16 Z" fill={accent} />
    <path d="M38 18 L42 14" stroke={accent} strokeWidth="2" strokeLinecap="round" />
  </g>
);

const Mujahid = ({ color, accent }: GlyphProps) => (
  <g>
    <path d="M16 12 L46 44" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <path d="M48 12 L18 44" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <path d="M14 42 L22 50" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    <path d="M50 42 L42 50" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="28" r="3.5" fill={accent} />
  </g>
);

const Sabir = ({ color, accent }: GlyphProps) => (
  <g>
    <path d="M16 40 Q16 50 32 50 Q48 50 48 40 Q40 46 32 46 Q24 46 16 40 Z" fill={color} />
    <path
      d="M32 12 Q40 22 36 30 Q34 34 32 36 Q30 34 28 30 Q24 22 32 12 Z"
      fill={accent}
    />
    <path d="M32 22 Q35 27 32 32 Q29 27 32 22 Z" fill={color} opacity="0.6" />
  </g>
);

const Muqatil = ({ color, accent }: GlyphProps) => (
  <g>
    <circle cx="32" cy="30" r="22" fill={accent} opacity="0.12" />
    <path d="M32 8 L32 40" stroke={color} strokeWidth="5" strokeLinecap="round" />
    <path d="M22 40 L42 40" stroke={accent} strokeWidth="4" strokeLinecap="round" />
    <path d="M32 40 L32 54" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="54" r="3" fill={accent} />
  </g>
);

const Farsan = ({ color, accent }: GlyphProps) => (
  <g>
    <path
      d="M18 48 Q18 34 26 28 Q28 20 36 18 Q34 24 38 26 Q46 28 46 38 L46 48 L40 48 L40 38 Q34 36 30 40 L30 48 Z"
      fill={color}
    />
    <path d="M12 16 L52 44" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    <path d="M10 14 L16 20" stroke={accent} strokeWidth="5" strokeLinecap="round" />
  </g>
);

const Qaid = ({ color, accent }: GlyphProps) => (
  <g>
    <path
      d="M32 10 Q46 14 46 28 Q46 44 32 52 Q18 44 18 28 Q18 14 32 10 Z"
      fill={color}
      opacity="0.9"
    />
    <path d="M24 24 Q26 20 30 22" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M40 24 Q38 20 34 22" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M26 34 Q32 40 38 34" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M32 26 L30 30 L34 30 Z" fill={accent} />
  </g>
);

const SultanAlNafs = ({ color, accent }: GlyphProps) => (
  <g>
    <path d="M16 20 L22 30 L32 16 L42 30 L48 20 L46 36 L18 36 Z" fill={accent} />
    <circle cx="32" cy="44" r="6" fill={color} />
    <path d="M22 56 Q22 46 32 46 Q42 46 42 56 Z" fill={color} />
    <circle cx="16" cy="18" r="2.5" fill={accent} />
    <circle cx="48" cy="18" r="2.5" fill={accent} />
  </g>
);

const Wali = ({ color, accent }: GlyphProps) => (
  <g>
    <circle cx="32" cy="32" r="26" fill={accent} opacity="0.14" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <line
        key={deg}
        x1="32"
        y1="32"
        x2={32 + 28 * Math.cos((deg * Math.PI) / 180)}
        y2={32 + 28 * Math.sin((deg * Math.PI) / 180)}
        stroke={accent}
        strokeWidth="1"
        opacity="0.5"
      />
    ))}
    <rect x="20" y="22" width="24" height="26" rx="1.5" fill={color} />
    <rect x="20" y="28" width="24" height="3" fill={accent} />
    <rect x="37" y="36" width="5" height="12" fill={accent} opacity="0.8" />
  </g>
);

const Khalifa = ({ color, accent }: GlyphProps) => (
  <g>
    {[...Array(12)].map((_, i) => {
      const deg = i * 30 - 90;
      return (
        <line
          key={i}
          x1={32 + 18 * Math.cos((deg * Math.PI) / 180)}
          y1={32 + 18 * Math.sin((deg * Math.PI) / 180)}
          x2={32 + 30 * Math.cos((deg * Math.PI) / 180)}
          y2={32 + 30 * Math.sin((deg * Math.PI) / 180)}
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
      );
    })}
    <path
      d="M42 20 A 14 14 0 1 0 42 44 A 11 11 0 1 1 42 20 Z"
      fill={color}
    />
    <path d="M20 48 L44 48 L42 56 L22 56 Z" fill={accent} opacity="0.85" />
  </g>
);

const GLYPHS: Record<number, (p: GlyphProps) => JSX.Element> = {
  1: Muhajir,
  2: Talib,
  3: Mujahid,
  4: Sabir,
  5: Muqatil,
  6: Farsan,
  7: Qaid,
  8: SultanAlNafs,
  9: Wali,
  10: Khalifa,
};

export interface RankBadgeProps {
  tier: number;
  division?: 1 | 2 | 3;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function RankBadge({
  tier,
  division,
  size = 40,
  showLabel = false,
  className,
}: RankBadgeProps) {
  const def = getRankDef(tier);
  const Glyph = GLYPHS[def.tier] ?? Muhajir;
  const accent = def.accent ?? def.color;
  const isHighTier = def.tier >= 8;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        title={`${def.name} ${division ? divisionLabel(division) : ''}`.trim()}
      >
        <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`${def.name} rank badge`}>
          {/* Octagonal frame echoing the eight-point star. */}
          <path
            d="M20 2 L44 2 L62 20 L62 44 L44 62 L20 62 L2 44 L2 20 Z"
            fill="#0A0E1A"
            stroke={accent}
            strokeWidth="2"
            opacity={isHighTier ? 1 : 0.8}
          />
          {isHighTier && (
            <path
              d="M20 2 L44 2 L62 20 L62 44 L44 62 L20 62 L2 44 L2 20 Z"
              fill="none"
              stroke={accent}
              strokeWidth="4"
              opacity="0.18"
            />
          )}
          <Glyph color={def.color === '#1F2937' ? '#F9FAFB' : def.color} accent={accent} />
        </svg>
      </div>

      {showLabel && (
        <div className="min-w-0">
          <p className="truncate font-display text-sm leading-tight" style={{ color: accent }}>
            {def.name}
            {division ? ` ${divisionLabel(division)}` : ''}
          </p>
          <p className="truncate font-arabic text-xs text-muted">{def.arabic}</p>
        </div>
      )}
    </div>
  );
}

/** Compact inline badge used in leaderboard rows and chat. */
export function RankPip({ tier, size = 20 }: { tier: number; size?: number }) {
  return <RankBadge tier={tier} size={size} />;
}
