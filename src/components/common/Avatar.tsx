/**
 * Avatars are generated sigils rather than image files: a gradient field, a
 * geometric frame and one of six emblems. That keeps the app asset-free and
 * consistent, and every avatar stays legible at 24px.
 */

import { AVATARS, type AvatarDef } from '@/game/constants';
import { cn } from '@/lib/utils';

function sigilPath(sigil: AvatarDef['sigil']): JSX.Element {
  switch (sigil) {
    case 'crescent':
      return (
        <path
          d="M40 18 A 14 14 0 1 0 40 46 A 11 11 0 1 1 40 18 Z"
          fill="currentColor"
        />
      );
    case 'star':
      return (
        <path
          d="M32 12 L37 27 L52 32 L37 37 L32 52 L27 37 L12 32 L27 27 Z"
          fill="currentColor"
        />
      );
    case 'sword':
      return (
        <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          <path d="M32 12 L32 42" />
          <path d="M24 40 L40 40" />
          <path d="M32 42 L32 52" />
        </g>
      );
    case 'shield':
      return (
        <path
          d="M32 12 L48 18 L48 32 Q48 44 32 52 Q16 44 16 32 L16 18 Z"
          fill="currentColor"
        />
      );
    case 'lantern':
      return (
        <g fill="currentColor">
          <rect x="24" y="20" width="16" height="22" rx="3" />
          <path d="M28 14 L36 14 L36 20 L28 20 Z" />
          <path d="M26 44 L38 44 L36 50 L28 50 Z" />
        </g>
      );
    case 'gate':
      return (
        <path
          d="M18 50 L18 28 Q18 14 32 14 Q46 14 46 28 L46 50 L38 50 L38 30 Q38 22 32 22 Q26 22 26 30 L26 50 Z"
          fill="currentColor"
        />
      );
  }
}

export interface AvatarProps {
  avatarId: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

export function Avatar({ avatarId, size = 40, className, ring = false }: AvatarProps) {
  const def = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  const gradientId = `av-grad-${def.id}`;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-lg border border-edge',
        ring && 'ring-2 ring-gold/60',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={def.name}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={def.colors[0]} />
            <stop offset="100%" stopColor={def.colors[1]} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${gradientId})`} />
        <g opacity="0.15" stroke="#F5F0E1" strokeWidth="0.75" fill="none">
          <path d="M32 0 L40 24 L64 32 L40 40 L32 64 L24 40 L0 32 L24 24 Z" />
        </g>
        <g className="text-bone/90" opacity="0.92">
          {sigilPath(def.sigil)}
        </g>
      </svg>
    </div>
  );
}

/** The 12-avatar picker used in onboarding and settings. */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {AVATARS.map((avatar) => {
        const selected = avatar.id === value;
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onChange(avatar.id)}
            aria-pressed={selected}
            aria-label={avatar.name}
            className={cn(
              'group flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all',
              selected ? 'bg-gold/15 ring-2 ring-gold' : 'hover:bg-card',
            )}
          >
            <Avatar avatarId={avatar.id} size={52} />
            <span
              className={cn(
                'line-clamp-1 text-[10px] leading-tight',
                selected ? 'text-gold' : 'text-muted',
              )}
            >
              {avatar.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
