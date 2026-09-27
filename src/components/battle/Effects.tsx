/**
 * Combat feedback effects.
 *
 * These are what make a tap feel like a hit: a screen shake with real decay,
 * a one-frame impact flash, a burst of sparks at the point of contact, and
 * ash on death. All of them respect the reduce-motion setting.
 */

import { memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/state';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Screen shake                                                        */
/* ------------------------------------------------------------------ */

/**
 * Wraps the arena. A normal hit nudges it; a critical rattles it. The offsets
 * decay rather than stepping, so it reads as impact rather than a glitch.
 */
export function ScreenShake({
  trigger,
  intensity = 'normal',
  children,
  className,
}: {
  /** Any changing value fires a shake. Use the damage timestamp. */
  trigger: number | null;
  intensity?: 'normal' | 'heavy';
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useGameStore((s) => s.settings.reduce_motion);

  const keyframes = useMemo(() => {
    if (reduceMotion) return { x: 0, y: 0 };
    const a = intensity === 'heavy' ? 14 : 7;
    return {
      x: [0, -a, a * 0.8, -a * 0.5, a * 0.3, 0],
      y: [0, a * 0.5, -a * 0.4, a * 0.25, 0, 0],
    };
  }, [intensity, reduceMotion]);

  return (
    <motion.div
      key={trigger ?? 'idle'}
      animate={keyframes}
      transition={{ duration: intensity === 'heavy' ? 0.42 : 0.26, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Impact flash                                                        */
/* ------------------------------------------------------------------ */

/** A single bright frame over the arena, as fighting games do on a hit. */
export const ImpactFlash = memo(function ImpactFlash({
  trigger,
  crit,
}: {
  trigger: number | null;
  crit: boolean;
}) {
  const reduceMotion = useGameStore((s) => s.settings.reduce_motion);
  if (reduceMotion || trigger === null) return null;

  return (
    <motion.div
      key={trigger}
      initial={{ opacity: crit ? 0.55 : 0.28 }}
      animate={{ opacity: 0 }}
      transition={{ duration: crit ? 0.3 : 0.16 }}
      className={cn(
        'pointer-events-none absolute inset-0 z-20 rounded-xl',
        crit ? 'bg-legendary' : 'bg-bone',
      )}
    />
  );
});

/* ------------------------------------------------------------------ */
/* Spark burst                                                         */
/* ------------------------------------------------------------------ */

interface Spark {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
}

/** Sparks thrown outward from the point of impact. */
export const SparkBurst = memo(function SparkBurst({
  trigger,
  crit,
}: {
  trigger: number | null;
  crit: boolean;
}) {
  const reduceMotion = useGameStore((s) => s.settings.reduce_motion);

  const sparks = useMemo<Spark[]>(() => {
    const count = crit ? 16 : 9;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i + Math.random() * 22,
      distance: (crit ? 48 : 30) + Math.random() * 26,
      size: 2 + Math.random() * (crit ? 3.5 : 2),
      delay: Math.random() * 0.06,
    }));
  }, [trigger, crit]);

  if (reduceMotion || trigger === null) return null;

  return (
    <div key={trigger} className="pointer-events-none absolute inset-0 z-20">
      {sparks.map((spark) => {
        const rad = (spark.angle * Math.PI) / 180;
        return (
          <motion.span
            key={spark.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos(rad) * spark.distance,
              y: Math.sin(rad) * spark.distance,
              scale: 0.2,
            }}
            transition={{ duration: crit ? 0.6 : 0.42, delay: spark.delay, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: spark.size,
              height: spark.size,
              backgroundColor: crit ? '#FBBF24' : '#F5F0E1',
              boxShadow: `0 0 ${crit ? 10 : 6}px ${crit ? '#FBBF24' : '#F5F0E1'}`,
            }}
          />
        );
      })}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Ash on death                                                        */
/* ------------------------------------------------------------------ */

/** Ash motes drifting upward as a monster dissolves. */
export const AshBurst = memo(function AshBurst({ active }: { active: boolean }) {
  const reduceMotion = useGameStore((s) => s.settings.reduce_motion);

  const motes = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 90,
        drift: (Math.random() - 0.5) * 40,
        rise: 60 + Math.random() * 70,
        size: 1.5 + Math.random() * 3,
        duration: 0.9 + Math.random() * 0.9,
        delay: Math.random() * 0.3,
      })),
    [active],
  );

  if (reduceMotion || !active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {motes.map((mote) => (
        <motion.span
          key={mote.id}
          initial={{ opacity: 0.85, x: mote.x, y: 20, scale: 1 }}
          animate={{ opacity: 0, x: mote.x + mote.drift, y: -mote.rise, scale: 0.3 }}
          transition={{ duration: mote.duration, delay: mote.delay, ease: 'easeOut' }}
          className="absolute left-1/2 top-1/2 rounded-full bg-[#C9C2B0]"
          style={{ width: mote.size, height: mote.size }}
        />
      ))}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Combo flare                                                         */
/* ------------------------------------------------------------------ */

/** The combo chip catches fire past three, and pulses on each increment. */
export const ComboFlare = memo(function ComboFlare({ combo }: { combo: number }) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (combo > 0) setPulse((p) => p + 1);
  }, [combo]);

  if (combo < 3) return null;

  return (
    <motion.span
      key={pulse}
      initial={{ scale: 1.5, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="pointer-events-none absolute inset-0 rounded-md bg-gold"
    />
  );
});

/* ------------------------------------------------------------------ */
/* Low-HP vignette                                                     */
/* ------------------------------------------------------------------ */

/** A red pulse at the screen edges when the player is nearly down. */
export function DangerVignette({ ratio }: { ratio: number }) {
  const reduceMotion = useGameStore((s) => s.settings.reduce_motion);
  if (ratio > 0.25) return null;

  const strength = 1 - ratio / 0.25;

  return (
    <motion.div
      aria-hidden="true"
      animate={reduceMotion ? { opacity: strength * 0.3 } : { opacity: [strength * 0.2, strength * 0.42, strength * 0.2] }}
      transition={reduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className="pointer-events-none fixed inset-0 z-30"
      style={{
        background:
          'radial-gradient(ellipse at center, transparent 45%, rgba(220,38,38,0.85) 100%)',
      }}
    />
  );
}

export { AnimatePresence };
