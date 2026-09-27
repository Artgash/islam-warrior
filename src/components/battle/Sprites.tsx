/**
 * Character and monster art.
 *
 * TWO LAYERS:
 *  1. If a real painted image exists for a subject, it is used (see
 *     `src/lib/art.ts`). Nothing else in the app needs to know.
 *  2. Otherwise the subject is DRAWN, procedurally, with the techniques a 2D
 *     game artist would use: a silhouette read first, then form shadow, then
 *     rim light from behind, then an occlusion gradient, then emissive
 *     details on top. Proportions, palette, horns, spines and eye count all
 *     derive deterministically from the monster's id, so all 1,056 monsters
 *     are individuals rather than recolours.
 *
 * The warrior's armour evolves across the ten rank tiers: cloth, then
 * leather, then mail, then plate, then gilded plate with a living aura.
 */

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Monster } from '@/types';
import { getRankDef } from '@/game/ranks/rankLogic';
import { monsterArtUrl, warriorArtUrl } from '@/lib/art';
import { cn } from '@/lib/utils';

/* ================================================================== */
/* Deterministic variation                                             */
/* ================================================================== */

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Stable pseudo-random stream from a seed, so a monster never redraws. */
function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

/* ================================================================== */
/* Palettes                                                            */
/* ================================================================== */

interface Palette {
  /** Deepest shadow. */
  dark: string;
  /** Local colour. */
  mid: string;
  /** Lit plane. */
  light: string;
  /** Rim light and emissive. */
  glow: string;
}

/**
 * Eleven bands across the road, walking from grey squalor at zone 1 to the
 * violet and fire of the Throne. Each is a proper four-value ramp rather
 * than a two-stop gradient, which is what lets the forms read as solid.
 */
const ZONE_PALETTES: Palette[] = [
  { dark: '#171A21', mid: '#3F4552', light: '#6C7484', glow: '#9AA3B2' }, // 1-6
  { dark: '#1B1030', mid: '#4C1D95', light: '#7C4DDB', glow: '#C4A2FF' }, // 7-12
  { dark: '#04211A', mid: '#0B5E45', light: '#12A177', glow: '#4EE6AE' }, // 13-18
  { dark: '#2A0E05', mid: '#7C2D12', light: '#C2510C', glow: '#FFA14A' }, // 19-24
  { dark: '#2A0716', mid: '#831843', light: '#C21E63', glow: '#FF6FA8' }, // 25-30
  { dark: '#0A1533', mid: '#1E3A8A', light: '#3B6FE0', glow: '#8AB4FF' }, // 31-36
  { dark: '#04212B', mid: '#12596B', light: '#0F9BB8', glow: '#57E0F7' }, // 37-42
  { dark: '#2B1804', mid: '#78350F', light: '#C07A12', glow: '#FFD166', }, // 43-48
  { dark: '#170033', mid: '#3F0080', light: '#6D28D9', glow: '#B58CFF' }, // 49-54
  { dark: '#1C0433', mid: '#581C87', light: '#9333EA', glow: '#D4A6FF' }, // 55-60
  { dark: '#2B0505', mid: '#7F1D1D', light: '#D32F2F', glow: '#FF8A6B' }, // 61-66
];

function paletteFor(zoneId: number): Palette {
  return ZONE_PALETTES[Math.min(ZONE_PALETTES.length - 1, Math.floor((zoneId - 1) / 6))];
}

/* ================================================================== */
/* Monster                                                             */
/* ================================================================== */

/** Silhouette archetypes, so monsters differ in shape and not just colour. */
type Build = 'hulking' | 'lean' | 'coiled' | 'shrouded';

const BUILDS: Build[] = ['hulking', 'lean', 'coiled', 'shrouded'];

interface MonsterDesign {
  palette: Palette;
  build: Build;
  horns: 0 | 1 | 2 | 3;
  eyes: 1 | 2 | 3 | 4;
  spines: number;
  lean: number;
  jaw: boolean;
  tattered: boolean;
  /** Boss-only: a second ring of outer glow. */
  crowned: boolean;
}

function designFor(monster: Monster): MonsterDesign {
  const seed = hashString(monster.id);
  const rng = seeded(seed);

  return {
    palette: paletteFor(monster.zone_id),
    build: BUILDS[seed % BUILDS.length],
    horns: (seed % 4) as 0 | 1 | 2 | 3,
    eyes: ((seed >> 3) % 4 === 0 ? 1 : ((seed >> 3) % 4)) as 1 | 2 | 3 | 4,
    spines: 3 + ((seed >> 5) % 6),
    lean: (rng() - 0.5) * 7,
    jaw: rng() > 0.45,
    tattered: rng() > 0.4,
    crowned: monster.is_boss,
  };
}

/** Body outline per build. Drawn in a 120x120 box, feet around y=104. */
function bodyPath(build: Build, boss: boolean): string {
  const w = boss ? 1.12 : 1;
  const s = (x: number) => 60 + (x - 60) * w;

  switch (build) {
    case 'hulking':
      return `M60 24
              C${s(86)} 28 ${s(94)} 48 ${s(92)} 70
              C${s(90)} 94 ${s(78)} 104 60 104
              C${s(42)} 104 ${s(30)} 94 ${s(28)} 70
              C${s(26)} 48 ${s(34)} 28 60 24 Z`;
    case 'lean':
      return `M60 22
              C${s(74)} 26 ${s(80)} 44 ${s(77)} 64
              C${s(75)} 88 ${s(70)} 104 60 104
              C${s(50)} 104 ${s(45)} 88 ${s(43)} 64
              C${s(40)} 44 ${s(46)} 26 60 22 Z`;
    case 'coiled':
      return `M60 26
              C${s(84)} 30 ${s(90)} 52 ${s(84)} 70
              C${s(78)} 88 ${s(84)} 98 ${s(72)} 104
              C${s(58)} 108 ${s(40)} 102 ${s(34)} 86
              C${s(28)} 66 ${s(36)} 32 60 26 Z`;
    case 'shrouded':
      return `M60 20
              C${s(80)} 26 ${s(88)} 46 ${s(88)} 72
              C${s(88)} 96 ${s(80)} 106 60 106
              C${s(40)} 106 ${s(32)} 96 ${s(32)} 72
              C${s(32)} 46 ${s(40)} 26 60 20 Z`;
  }
}

export interface MonsterSpriteProps {
  monster: Monster;
  dying?: boolean;
  hit?: boolean;
  size?: number;
  className?: string;
}

export const MonsterSprite = memo(function MonsterSprite({
  monster,
  dying = false,
  hit = false,
  size = 150,
  className,
}: MonsterSpriteProps) {
  const design = useMemo(() => designFor(monster), [monster]);
  const painted = monsterArtUrl(monster);

  const { palette: p, build, horns, eyes, spines, lean, jaw, tattered } = design;
  const id = monster.id;
  const boss = monster.is_boss;
  const isFinal = monster.zone_id === 66 && boss;
  const eyeColor = isFinal ? '#FF3B30' : p.glow;

  return (
    <motion.div
      className={cn('relative select-none', className)}
      style={{ width: size, height: size }}
      animate={
        dying
          ? { opacity: 0, y: 20, scale: 0.88, filter: 'blur(12px)' }
          : hit
            ? { x: [0, 10, -7, 3, 0], filter: ['brightness(3)', 'brightness(1)'] }
            : { y: [0, -6, 0] }
      }
      transition={
        dying
          ? { duration: 0.95, ease: 'easeIn' }
          : hit
            ? { duration: 0.3 }
            : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label={monster.name}
        className="overflow-visible"
      >
        <defs>
          {/* Form shadow: lit from upper-left, falling into darkness. */}
          <linearGradient id={`body-${id}`} x1="0.25" y1="0" x2="0.75" y2="1">
            <stop offset="0%" stopColor={p.light} />
            <stop offset="42%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.dark} />
          </linearGradient>

          {/* Ambient occlusion pooling at the base. */}
          <linearGradient id={`occl-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.65" />
          </linearGradient>

          {/* Rim light from behind — the single biggest readability win. */}
          <linearGradient id={`rim-${id}`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.glow} stopOpacity="0.95" />
            <stop offset="35%" stopColor={p.glow} stopOpacity="0.25" />
            <stop offset="70%" stopColor={p.glow} stopOpacity="0" />
          </linearGradient>

          <radialGradient id={`aura-${id}`}>
            <stop offset="0%" stopColor={p.glow} stopOpacity={boss ? '0.5' : '0.3'} />
            <stop offset="55%" stopColor={p.mid} stopOpacity="0.16" />
            <stop offset="100%" stopColor={p.mid} stopOpacity="0" />
          </radialGradient>

          <radialGradient id={`eye-${id}`}>
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor={eyeColor} />
            <stop offset="100%" stopColor={eyeColor} stopOpacity="0" />
          </radialGradient>

          <filter id={`soft-${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          {/* Clips the rim and shading to the silhouette. */}
          <clipPath id={`clip-${id}`}>
            <path d={bodyPath(build, boss)} />
          </clipPath>
        </defs>

        {/* Aura */}
        <ellipse cx="60" cy="64" rx={boss ? 58 : 46} ry={boss ? 56 : 44} fill={`url(#aura-${id})`}>
          <animate
            attributeName="ry"
            values={boss ? '56;60;56' : '44;47;44'}
            dur="5s"
            repeatCount="indefinite"
          />
        </ellipse>

        {/* Boss corona */}
        {boss && (
          <circle
            cx="60"
            cy="64"
            r="52"
            fill="none"
            stroke={p.glow}
            strokeWidth="0.8"
            strokeOpacity="0.32"
            strokeDasharray="5 9"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 60 64"
              to="360 60 64"
              dur="34s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Ground shadow */}
        <ellipse cx="60" cy="108" rx={boss ? 36 : 27} ry="6" fill="#000" opacity="0.55" />

        {/* Smoke at the base — these things never quite touch the ground. */}
        <g opacity="0.5" filter={`url(#soft-${id})`}>
          <ellipse cx="48" cy="102" rx="14" ry="6" fill={p.dark}>
            <animate attributeName="cx" values="48;54;48" dur="7s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="74" cy="104" rx="12" ry="5" fill={p.dark}>
            <animate attributeName="cx" values="74;68;74" dur="9s" repeatCount="indefinite" />
          </ellipse>
        </g>

        <g transform={`rotate(${lean} 60 72)`}>
          {/* Horns sit behind the body so they read as depth. */}
          {horns > 0 && (
            <g fill={p.dark}>
              <path d="M44 36 C36 22 28 14 22 8 C34 14 44 24 49 33 Z" />
              <path d="M76 36 C84 22 92 14 98 8 C86 14 76 24 71 33 Z" />
            </g>
          )}
          {horns > 1 && (
            <g fill={p.dark} opacity="0.85">
              <path d="M51 31 C47 18 45 12 43 6 C50 14 54 24 55 30 Z" />
              <path d="M69 31 C73 18 75 12 77 6 C70 14 66 24 65 30 Z" />
            </g>
          )}
          {horns > 2 && (
            <g fill={p.mid} opacity="0.7">
              <path d="M36 44 C26 38 18 34 12 30 C24 32 34 38 40 43 Z" />
              <path d="M84 44 C94 38 102 34 108 30 C96 32 86 38 80 43 Z" />
            </g>
          )}

          {/* Spines along the back */}
          <g fill={p.dark}>
            {Array.from({ length: spines }).map((_, i) => {
              const t = (i + 1) / (spines + 1);
              const x = 32 + t * 56;
              const h = 7 + ((hashString(id + i) % 11));
              return <path key={i} d={`M${x} 46 L${x + 3.5} ${46 - h} L${x + 7} 46 Z`} />;
            })}
          </g>

          {/* Silhouette */}
          <path d={bodyPath(build, boss)} fill={`url(#body-${id})`} />

          {/* Shading inside the silhouette */}
          <g clipPath={`url(#clip-${id})`}>
            <path d={bodyPath(build, boss)} fill={`url(#occl-${id})`} />
            <path d={bodyPath(build, boss)} fill={`url(#rim-${id})`} />

            {/* Chest plate / ribcage suggestion */}
            <path
              d="M46 62 C52 58 68 58 74 62 C72 74 68 82 60 86 C52 82 48 74 46 62 Z"
              fill={p.dark}
              opacity="0.35"
            />

            {/* Tattered cloth hanging off the frame */}
            {tattered && (
              <g fill={p.dark} opacity="0.5">
                <path d="M34 72 L40 104 L44 88 L48 104 L50 74 Z" />
                <path d="M70 74 L72 104 L76 90 L80 104 L86 72 Z" />
              </g>
            )}
          </g>

          {/* Brow ridge, casting the eyes into shadow */}
          <path
            d="M40 52 C48 46 72 46 80 52 C72 50 48 50 40 52 Z"
            fill={p.dark}
            opacity="0.9"
          />

          {/* Eyes — emissive, and the last thing you notice */}
          {Array.from({ length: eyes }).map((_, i) => {
            const spacing = eyes === 1 ? 0 : eyes === 2 ? 15 : 12;
            const x = 60 + (i - (eyes - 1) / 2) * spacing;
            const y = eyes > 2 && i % 2 === 1 ? 60 : 57;
            const dur = 2.6 + ((hashString(id + 'eye' + i) % 30) / 10);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="7" fill={`url(#eye-${id})`} opacity="0.55" />
                <ellipse cx={x} cy={y} rx="4.2" ry="2.6" fill="#05070C" />
                <circle cx={x} cy={y} r="1.9" fill={eyeColor}>
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur={`${dur}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}

          {/* Jaw */}
          {jaw ? (
            <g>
              <path d="M48 74 Q60 88 72 74 Q60 80 48 74 Z" fill="#05070C" />
              {Array.from({ length: 5 }).map((_, i) => (
                <path
                  key={i}
                  d={`M${51 + i * 4.5} 76 L${52.5 + i * 4.5} 81 L${54 + i * 4.5} 76 Z`}
                  fill={p.light}
                  opacity="0.8"
                />
              ))}
            </g>
          ) : (
            <path
              d="M50 78 Q60 72 70 78"
              fill="none"
              stroke="#05070C"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* Embers rising off bosses */}
        {boss &&
          Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} cx={40 + i * 10} cy="100" r="1.4" fill={p.glow} opacity="0">
              <animate
                attributeName="cy"
                values="100;44"
                dur={`${3 + i * 0.7}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;0.9;0"
                dur={`${3 + i * 0.7}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
      </svg>

      {/* A painted illustration, when one exists, layered over the vector. */}
      {painted && (
        <img
          src={painted}
          alt={monster.name}
          className="absolute inset-0 h-full w-full object-contain"
          loading="lazy"
          onError={(e) => {
            // The vector underneath is the fallback; just hide the broken img.
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </motion.div>
  );
});

/* ================================================================== */
/* Warrior                                                             */
/* ================================================================== */

/** Armour progression across the ten rank tiers. */
interface ArmourTier {
  cloak: string;
  cloakLight: string;
  plate: string;
  plateLight: string;
  trim: string;
  /** Shoulder pauldrons appear from mail upward. */
  pauldrons: boolean;
  /** A full helm replaces the hood at the top tiers. */
  helm: boolean;
  cape: boolean;
  auraStrength: number;
}

function armourFor(tier: number, accent: string): ArmourTier {
  if (tier <= 2) {
    return {
      cloak: '#2A2F3C', cloakLight: '#3C4354',
      plate: '#4A4034', plateLight: '#6B5B49',
      trim: accent, pauldrons: false, helm: false, cape: false, auraStrength: 0.12,
    };
  }
  if (tier <= 4) {
    return {
      cloak: '#232A38', cloakLight: '#37415A',
      plate: '#5A4632', plateLight: '#836647',
      trim: accent, pauldrons: false, helm: false, cape: true, auraStrength: 0.18,
    };
  }
  if (tier <= 6) {
    return {
      cloak: '#1C2432', cloakLight: '#2E3A4F',
      plate: '#5C6470', plateLight: '#8D97A6',
      trim: accent, pauldrons: true, helm: false, cape: true, auraStrength: 0.26,
    };
  }
  if (tier <= 8) {
    return {
      cloak: '#151B26', cloakLight: '#27324a',
      plate: '#6E7787', plateLight: '#AEB8C7',
      trim: accent, pauldrons: true, helm: true, cape: true, auraStrength: 0.36,
    };
  }
  return {
    cloak: '#100C1A', cloakLight: '#231A33',
    plate: '#8A7333', plateLight: '#E8CE7A',
    trim: accent, pauldrons: true, helm: true, cape: true, auraStrength: 0.5,
  };
}

export interface WarriorSpriteProps {
  rankTier: number;
  attacking?: boolean;
  hurt?: boolean;
  fallen?: boolean;
  size?: number;
  className?: string;
}

export const WarriorSprite = memo(function WarriorSprite({
  rankTier,
  attacking = false,
  hurt = false,
  fallen = false,
  size = 150,
  className,
}: WarriorSpriteProps) {
  const def = getRankDef(rankTier);
  const accent = def.accent ?? def.color;
  const a = armourFor(def.tier, accent);
  const painted = warriorArtUrl(def.tier);
  const uid = `w${def.tier}`;

  return (
    <motion.div
      className={cn('relative select-none', className)}
      style={{ width: size, height: size }}
      animate={
        fallen
          ? { rotate: -14, y: 20, opacity: 0.4 }
          : attacking
            ? { x: [0, 22, -4, 0], rotate: [0, -8, 2, 0] }
            : hurt
              ? { x: [0, -12, 8, 0], filter: ['brightness(2.4)', 'brightness(1)'] }
              : { y: [0, -5, 0] }
      }
      transition={
        attacking
          ? { duration: 0.34, ease: 'easeOut' }
          : hurt
            ? { duration: 0.3 }
            : fallen
              ? { duration: 0.55 }
              : { duration: 3.8, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label={`Your warrior, rank ${def.name}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`cloak-${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={a.cloakLight} />
            <stop offset="60%" stopColor={a.cloak} />
            <stop offset="100%" stopColor="#0A0E1A" />
          </linearGradient>

          <linearGradient id={`plate-${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={a.plateLight} />
            <stop offset="55%" stopColor={a.plate} />
            <stop offset="100%" stopColor="#12161F" />
          </linearGradient>

          <linearGradient id={`blade-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E8EDF5" />
            <stop offset="45%" stopColor="#9BA6B8" />
            <stop offset="55%" stopColor="#D5DCE8" />
            <stop offset="100%" stopColor="#5A6475" />
          </linearGradient>

          <radialGradient id={`waura-${uid}`}>
            <stop offset="0%" stopColor={accent} stopOpacity={String(a.auraStrength)} />
            <stop offset="60%" stopColor={accent} stopOpacity={String(a.auraStrength * 0.3)} />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`wrim-${uid}`} x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
            <stop offset="30%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Aura */}
        <ellipse cx="60" cy="64" rx="50" ry="50" fill={`url(#waura-${uid})`}>
          <animate attributeName="rx" values="50;54;50" dur="6s" repeatCount="indefinite" />
        </ellipse>

        <ellipse cx="60" cy="108" rx="24" ry="5.5" fill="#000" opacity="0.6" />

        {/* Cape behind everything */}
        {a.cape && (
          <path
            d="M46 42 C30 58 26 84 32 106 L48 100 L52 62 Z
               M74 42 C90 58 94 84 88 106 L72 100 L68 62 Z"
            fill={`url(#cloak-${uid})`}
            opacity="0.95"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-1.2 60 44; 1.2 60 44; -1.2 60 44"
              dur="5s"
              repeatCount="indefinite"
            />
          </path>
        )}

        {/* Legs */}
        <path d="M50 86 L57 86 L56 106 L49 106 Z" fill={`url(#plate-${uid})`} />
        <path d="M63 86 L70 86 L71 106 L64 106 Z" fill={`url(#plate-${uid})`} />
        <path d="M47 104 L58 104 L58 108 L46 108 Z" fill={a.cloak} />
        <path d="M62 104 L73 104 L74 108 L62 108 Z" fill={a.cloak} />

        {/* Torso */}
        <path
          d="M47 46 C52 42 68 42 73 46 L76 72 C76 84 70 88 60 88 C50 88 44 84 44 72 Z"
          fill={`url(#plate-${uid})`}
        />
        {/* Chest highlight and belt */}
        <path d="M52 50 C56 47 64 47 68 50 L69 62 L51 62 Z" fill={a.plateLight} opacity="0.3" />
        <path d="M45 70 L75 70 L75 76 L45 76 Z" fill={a.cloak} />
        <path d="M56 69 L64 69 L64 77 L56 77 Z" fill={a.trim} opacity="0.9" />

        {/* Pauldrons */}
        {a.pauldrons && (
          <>
            <path d="M40 46 C44 40 52 40 54 46 L52 56 C46 57 42 54 40 46 Z" fill={`url(#plate-${uid})`} />
            <path d="M80 46 C76 40 68 40 66 46 L68 56 C74 57 78 54 80 46 Z" fill={`url(#plate-${uid})`} />
            <path d="M41 46 C45 41 51 41 53 46" fill="none" stroke={a.trim} strokeWidth="1.2" opacity="0.8" />
            <path d="M79 46 C75 41 69 41 67 46" fill="none" stroke={a.trim} strokeWidth="1.2" opacity="0.8" />
          </>
        )}

        {/* Head: hood at low ranks, closed helm at high ranks */}
        {a.helm ? (
          <g>
            <path
              d="M48 24 C48 16 72 16 72 24 L72 44 C72 50 48 50 48 44 Z"
              fill={`url(#plate-${uid})`}
            />
            <path d="M48 34 L72 34 L72 39 L48 39 Z" fill="#05070C" />
            <path d="M59 22 L61 22 L61 44 L59 44 Z" fill={a.trim} opacity="0.55" />
            {!fallen && (
              <>
                <circle cx="54" cy="36.5" r="1.5" fill={accent}>
                  <animate attributeName="opacity" values="1;0.55;1" dur="3.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="66" cy="36.5" r="1.5" fill={accent}>
                  <animate attributeName="opacity" values="1;0.55;1" dur="3.4s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>
        ) : (
          <g>
            <path
              d="M46 26 C48 14 72 14 74 26 L74 46 C68 52 52 52 46 46 Z"
              fill={`url(#cloak-${uid})`}
            />
            <path d="M52 32 C56 28 64 28 68 32 L68 42 C64 46 56 46 52 42 Z" fill="#05070C" />
            {!fallen && (
              <>
                <circle cx="56" cy="37" r="1.6" fill={accent}>
                  <animate attributeName="opacity" values="1;0.5;1" dur="3.1s" repeatCount="indefinite" />
                </circle>
                <circle cx="64" cy="37" r="1.6" fill={accent}>
                  <animate attributeName="opacity" values="1;0.5;1" dur="3.1s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>
        )}

        {/* Rim light over the whole figure */}
        <path
          d="M47 46 C52 42 68 42 73 46 L76 72 C76 84 70 88 60 88 C50 88 44 84 44 72 Z"
          fill={`url(#wrim-${uid})`}
          opacity="0.7"
        />

        {/* Shield */}
        <g>
          <path
            d="M26 50 L44 55 L44 76 C44 88 36 95 35 96 C34 95 26 88 26 76 Z"
            fill={`url(#plate-${uid})`}
            stroke={a.trim}
            strokeWidth="1.4"
          />
          <path d="M35 60 L38 70 L35 82 L32 70 Z" fill={a.trim} opacity="0.85" />
          <path d="M27 52 L43 56.5" stroke={a.plateLight} strokeWidth="1" opacity="0.5" />
        </g>

        {/* Sword — longer, brighter and gilded as rank climbs */}
        <motion.g
          animate={attacking ? { rotate: -42 } : { rotate: 0 }}
          transition={{ duration: 0.2 }}
          style={{ originX: '78px', originY: '64px' }}
        >
          <path
            d={`M79 ${def.tier >= 6 ? 10 : 20} L86 ${def.tier >= 6 ? 10 : 20} L86 62 L79 62 Z`}
            fill={`url(#blade-${uid})`}
          />
          {/* Fuller down the centre of the blade */}
          <path
            d={`M82 ${def.tier >= 6 ? 14 : 23} L83 ${def.tier >= 6 ? 14 : 23} L83 60 L82 60 Z`}
            fill="#05070C"
            opacity="0.35"
          />
          {def.tier >= 6 && (
            <path
              d="M79 10 L86 10 L86 62 L79 62 Z"
              fill={accent}
              opacity="0.22"
            />
          )}
          {/* Crossguard */}
          <path d="M71 61 L94 61 L94 66 L71 66 Z" fill={a.trim} />
          <path d="M71 61 L94 61 L94 62.6 L71 62.6 Z" fill="#FFF" opacity="0.35" />
          {/* Grip and pommel */}
          <path d="M80.5 66 L85 66 L85 78 L80.5 78 Z" fill="#3A2A18" />
          <circle cx="82.7" cy="80.5" r="3.2" fill={a.trim} />
        </motion.g>

        {/* Motes of light for the top ranks */}
        {def.tier >= 8 &&
          Array.from({ length: 4 }).map((_, i) => (
            <circle key={i} cx={44 + i * 11} cy="96" r="1.2" fill={accent} opacity="0">
              <animate attributeName="cy" values="96;40" dur={`${4 + i}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.85;0" dur={`${4 + i}s`} repeatCount="indefinite" />
            </circle>
          ))}
      </svg>

      {painted && (
        <img
          src={painted}
          alt={`Warrior, rank ${def.name}`}
          className="absolute inset-0 h-full w-full object-contain"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </motion.div>
  );
});
