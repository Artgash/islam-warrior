/**
 * Ten-step onboarding, ending with a guided tutorial battle and the player's
 * first sight of Iblis.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Bell, Check, Sparkles } from 'lucide-react';
import type { Archetype, HabitIntensity, HabitTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge, Progress } from '@/components/ui/misc';
import { AvatarPicker } from '@/components/common/Avatar';
import { StarDivider, EightPointStar, GeometricField } from '@/components/common/StarDivider';
import { MonsterSprite, WarriorSprite } from '@/components/battle/Sprites';
import { HPBar } from '@/components/battle/HPBar';
import { RankBadge } from '@/components/rank/RankBadge';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/battle/MoveButton';
import { ARCHETYPES, AVATARS } from '@/game/constants';
import { HABIT_PACKS } from '@/game/habits/packs';
import { INTENSITY_LEVELS, intensityLabel, intensityHint } from '@/game/habits/intensity';
import { getMonster } from '@/game/zones/monsters';
import { useGameStore } from '@/state';
import { markOnboarded } from '@/api/auth';
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 10;

interface Draft {
  name: string;
  avatar_id: string;
  archetype: Archetype;
  packs: string[];
  habits: HabitTemplate[];
  cue_time: string;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);
  const createCharacter = useGameStore((s) => s.createCharacter);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    name: '',
    avatar_id: AVATARS[0].id,
    archetype: 'warrior',
    packs: [],
    habits: [],
    cue_time: '05:00',
  });

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return draft.name.trim().length >= 2 && draft.name.trim().length <= 20;
      case 3:
        return draft.packs.length > 0;
      case 4:
        return draft.habits.length > 0;
      default:
        return true;
    }
  }, [step, draft]);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (!user) {
      toast.error('Your session expired. Sign in again.');
      navigate('/auth', { replace: true });
      return;
    }

    createCharacter(user.id, {
      name: draft.name,
      avatar_id: draft.avatar_id,
      archetype: draft.archetype,
      habits: draft.habits,
    });

    await markOnboarded(user.id);
    toast.success('The road begins.');
    navigate('/', { replace: true });
  };

  /* ---------------------------------------------------------------- */

  return (
    <div className="relative min-h-dvh">
      <GeometricField className="text-gold" />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-5">
        {/* Progress */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted">
            <span>
              Step {step + 1} of {TOTAL_STEPS}
            </span>
            <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
          </div>
          <Progress value={(step + 1) / TOTAL_STEPS} />
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && <StepName draft={draft} patch={patch} />}
              {step === 1 && <StepAvatar draft={draft} patch={patch} />}
              {step === 2 && <StepArchetype draft={draft} patch={patch} />}
              {step === 3 && <StepPacks draft={draft} patch={patch} />}
              {step === 4 && <StepCustomise draft={draft} patch={patch} />}
              {step === 5 && <StepCue draft={draft} patch={patch} />}
              {step === 6 && <StepTutorial onDone={next} />}
              {step === 7 && <StepRankReveal name={draft.name} />}
              {step === 8 && <StepNotifications />}
              {step === 9 && <StepIblis name={draft.name} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls — the tutorial supplies its own. */}
        {step !== 6 && (
          <div className="mt-6 flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={back} aria-label="Back">
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            {step < TOTAL_STEPS - 1 ? (
              <Button onClick={next} disabled={!canAdvance}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={finish} size="lg">
                Enter the Slums of Nafs
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

type StepProps = { draft: Draft; patch: (next: Partial<Draft>) => void };

function StepHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-5">
      <p className="heading-rule mb-1">{eyebrow}</p>
      <h2 className="font-display text-2xl text-bone">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
    </div>
  );
}

function StepName({ draft, patch }: StepProps) {
  return (
    <div>
      <StepHeading
        eyebrow="First"
        title="What are you called?"
        description="This is the name the leaderboards will carry, and the name Iblis will use."
      />
      <Label htmlFor="warrior-name">Warrior name</Label>
      <Input
        id="warrior-name"
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="2-20 characters"
        maxLength={20}
        autoFocus
      />
      <p className="mt-2 text-xs text-muted">{draft.name.trim().length}/20</p>
    </div>
  );
}

function StepAvatar({ draft, patch }: StepProps) {
  return (
    <div>
      <StepHeading
        eyebrow="Second"
        title="Choose your sigil"
        description="Your mark on every board, every guild roster, every profile."
      />
      <AvatarPicker value={draft.avatar_id} onChange={(id) => patch({ avatar_id: id })} />
    </div>
  );
}

function StepArchetype({ draft, patch }: StepProps) {
  return (
    <div>
      <StepHeading
        eyebrow="Third"
        title="Who do you want to become?"
        description="Your archetype grants a permanent head start. It shapes the road, it does not lock it."
      />
      <div className="grid gap-2.5">
        {ARCHETYPES.map((archetype) => {
          const selected = archetype.id === draft.archetype;
          return (
            <button
              key={archetype.id}
              type="button"
              onClick={() => patch({ archetype: archetype.id })}
              aria-pressed={selected}
              className={cn(
                'panel flex items-start gap-3 p-3.5 text-left transition-all',
                selected ? 'border-gold shadow-gold' : 'hover:border-gold/40',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display text-base text-bone">{archetype.name}</h3>
                  <span className="font-arabic text-sm text-gold">{archetype.arabic}</span>
                </div>
                <p className="mt-0.5 text-xs italic text-gold/80">{archetype.tagline}</p>
                <p className="mt-1.5 text-xs text-muted">{archetype.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(archetype.bonus).map(([stat, value]) => (
                    <Badge key={stat} variant="gold">
                      +{value} {stat.replace('_stat', '')}
                    </Badge>
                  ))}
                </div>
              </div>
              {selected && <Check className="size-5 shrink-0 text-gold" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepPacks({ draft, patch }: StepProps) {
  const toggle = (packId: string) => {
    const pack = HABIT_PACKS.find((p) => p.id === packId);
    if (!pack) return;

    const selected = draft.packs.includes(packId);
    const packs = selected ? draft.packs.filter((p) => p !== packId) : [...draft.packs, packId];

    const habits = selected
      ? draft.habits.filter((h) => !pack.habits.some((ph) => ph.name === h.name))
      : [...draft.habits, ...pack.habits];

    patch({ packs, habits });
  };

  return (
    <div>
      <StepHeading
        eyebrow="Fourth"
        title="Pick your starting packs"
        description="Choose any number. You will trim them on the next step, and you can add or remove habits at any time."
      />
      <div className="grid gap-2.5">
        {HABIT_PACKS.map((pack) => {
          const selected = draft.packs.includes(pack.id);
          const color = CATEGORY_COLORS[pack.category];

          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => toggle(pack.id)}
              aria-pressed={selected}
              className={cn(
                'panel flex items-center gap-3 p-3.5 text-left transition-all',
                selected ? 'border-gold shadow-gold' : 'hover:border-gold/40',
              )}
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display text-base text-bone">{pack.name}</h3>
                  {pack.arabic && (
                    <span className="font-arabic text-sm" style={{ color }}>
                      {pack.arabic}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">{pack.description}</p>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted/70">
                  {pack.habits.length} habits
                </p>
              </div>
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded border',
                  selected ? 'border-gold bg-gold text-night' : 'border-edge',
                )}
              >
                {selected && <Check className="size-4" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepCustomise({ draft, patch }: StepProps) {
  const remove = (name: string) =>
    patch({ habits: draft.habits.filter((h) => h.name !== name) });

  const setIntensity = (name: string, intensity: HabitIntensity) =>
    patch({
      habits: draft.habits.map((h) => (h.name === name ? { ...h, intensity } : h)),
    });

  return (
    <div>
      <StepHeading
        eyebrow="Fifth"
        title="Trim it down"
        description="Three honest habits beat twenty aspirational ones. Remove anything you would not do this week, and set how hard each one really is for you."
      />

      <p className="mb-3 text-xs text-muted">
        {draft.habits.length} habit{draft.habits.length === 1 ? '' : 's'} selected
      </p>

      <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
        {draft.habits.map((habit) => {
          const color = CATEGORY_COLORS[habit.category];
          return (
            <div
              key={habit.name}
              className="panel p-3"
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm text-bone">{habit.name}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color }}>
                    {CATEGORY_LABELS[habit.category]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(habit.name)}
                  className="shrink-0 text-xs text-muted transition-colors hover:text-danger"
                  aria-label={`Remove ${habit.name}`}
                >
                  Remove
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5">
                {INTENSITY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setIntensity(habit.name, level)}
                    aria-pressed={habit.intensity === level}
                    aria-label={`${intensityLabel(level)} — ${intensityHint(level)}`}
                    className={cn(
                      'flex-1 rounded border py-1 text-[10px] transition-all',
                      habit.intensity === level
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-edge text-muted hover:border-gold/40',
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                {intensityLabel(habit.intensity)} · {intensityHint(habit.intensity)}
              </p>
            </div>
          );
        })}

        {draft.habits.length === 0 && (
          <p className="rounded-lg border border-dashed border-edge p-6 text-center text-sm text-muted">
            Nothing selected. Go back and pick at least one habit.
          </p>
        )}
      </div>
    </div>
  );
}

function StepCue({ draft, patch }: StepProps) {
  return (
    <div>
      <StepHeading
        eyebrow="Sixth"
        title="When does your day start?"
        description="A cue beats motivation. We will use this as the default reminder time for your habits — you can set each one individually later."
      />
      <Label htmlFor="cue-time">Daily cue time</Label>
      <Input
        id="cue-time"
        type="time"
        value={draft.cue_time}
        onChange={(e) => patch({ cue_time: e.target.value })}
        className="max-w-[160px]"
      />
      <div className="panel mt-5 p-4">
        <p className="text-sm leading-relaxed text-muted">
          Most warriors anchor to Fajr. The habits that survive are the ones attached to something
          that already happens every day.
        </p>
      </div>
    </div>
  );
}

/** Guided three-tap battle against a training dummy. */
function StepTutorial({ onDone }: { onDone: () => void }) {
  const dummy = useMemo(() => {
    const base = getMonster(1, 0);
    return { ...base, name: 'Training Shade', max_hp: 30, attack: 0 };
  }, []);

  const [hp, setHp] = useState(30);
  const [hits, setHits] = useState(0);
  const [hit, setHit] = useState(false);

  const strike = () => {
    const damage = 10;
    const nextHp = Math.max(0, hp - damage);
    setHp(nextHp);
    setHits((h) => h + 1);
    setHit(true);
    setTimeout(() => setHit(false), 260);
  };

  const dead = hp <= 0;

  return (
    <div>
      <StepHeading
        eyebrow="Seventh"
        title="This is how you fight"
        description="Every habit you complete in real life fires as a move. Tap three times to put this one down."
      />

      <div className="panel framed relative overflow-hidden p-4">
        <div className="mb-3">
          <HPBar current={hp} max={30} label={dummy.name} variant="monster" />
        </div>

        <div className="flex items-end justify-between px-2">
          <WarriorSprite rankTier={1} size={96} attacking={hit} />
          {!dead ? (
            <MonsterSprite monster={dummy} size={96} hit={hit} />
          ) : (
            <MonsterSprite monster={dummy} size={96} dying />
          )}
        </div>
      </div>

      <div className="mt-4">
        {!dead ? (
          <Button size="block" onClick={strike}>
            Strike ({3 - hits} left)
          </Button>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="mb-3 text-center text-sm text-emerald">
              That is the whole loop. Real habits, real damage.
            </p>
            <Button size="block" onClick={onDone}>
              I understand
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StepRankReveal({ name }: { name: string }) {
  return (
    <div className="text-center">
      <StepHeading eyebrow="Eighth" title="Your standing" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="my-6 flex justify-center"
      >
        <RankBadge tier={1} size={120} />
      </motion.div>

      <h3 className="font-display text-2xl text-bone">
        {name.trim() || 'Warrior'}, you begin as
      </h3>
      <p className="mt-1 font-display text-3xl text-[#6B7280]">Muhajir III</p>
      <p className="font-arabic text-lg text-muted">المهاجر</p>
      <p className="mt-2 text-sm text-muted">The Migrant — the one who leaves what he was.</p>

      <StarDivider className="my-5" />

      <div className="panel p-4 text-left">
        <p className="heading-rule mb-2">At this rank</p>
        <ul className="space-y-1.5 text-sm text-muted">
          <li className="flex items-center gap-2">
            <EightPointStar size={10} className="text-gold" />3 habit slots
          </li>
          <li className="flex items-center gap-2">
            <EightPointStar size={10} className="text-gold" />
            The shop opens at Talib
          </li>
          <li className="flex items-center gap-2">
            <EightPointStar size={10} className="text-gold" />
            Nine ranks above you. Khalifa is the last.
          </li>
        </ul>
      </div>
    </div>
  );
}

function StepNotifications() {
  const [asked, setAsked] = useState(false);

  const request = async () => {
    setAsked(true);
    try {
      if (typeof Notification === 'undefined') {
        toast.message('This browser does not support notifications.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Reminders enabled.');
      } else {
        toast.message('No reminders. You can enable them later in Settings.');
      }
    } catch {
      toast.message('Notifications unavailable here.');
    }
  };

  return (
    <div>
      <StepHeading
        eyebrow="Ninth"
        title="Should we remind you?"
        description="One quiet nudge at your cue time. No streaks-are-dying panic, no guilt. You can turn this off at any point."
      />

      <div className="panel flex items-start gap-3 p-4">
        <Bell className="mt-0.5 size-5 shrink-0 text-gold" />
        <div>
          <p className="text-sm text-bone">Habit reminders</p>
          <p className="mt-1 text-xs text-muted">
            Fires once per habit at its cue time. Iblis notifications are separate, and rare.
          </p>
        </div>
      </div>

      <Button variant="secondary" size="block" className="mt-4" onClick={request} disabled={asked}>
        {asked ? 'Preference saved' : 'Enable reminders'}
      </Button>
    </div>
  );
}

function StepIblis({ name }: { name: string }) {
  return (
    <div className="relative">
      <div className="iblis-smoke pointer-events-none absolute -inset-8 opacity-60 blur-2xl" />

      <div className="relative">
        <StepHeading eyebrow="Last" title="One more thing" />

        <div className="panel framed border-iblis/50 p-5 text-center shadow-iblis">
          <p className="mb-4 font-display text-[10px] uppercase tracking-[0.4em] text-[#A78BFA]">
            At the end of the road
          </p>

          <motion.div
            animate={{ opacity: [0.45, 0.85, 0.45] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="mx-auto mb-4 h-24 w-24 rounded-full bg-iblis/40 blur-2xl"
          />

          <p className="font-display text-xl leading-relaxed text-bone">
            &ldquo;{name.trim() || 'Warrior'}. I have been waiting since before you had a name.&rdquo;
          </p>

          <p className="mt-5 text-sm text-muted">
            He sits at Zone 66 with 999,999,999,999,999,999 HP. He will speak to you roughly once a
            week — no more. You can answer him, or say nothing.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2 text-gold">
            <Sparkles className="size-4" />
            <p className="text-sm">Sixty-six zones. One enemy. Start with tomorrow's Fajr.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
