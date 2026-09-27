/**
 * The Iblis tab: every word he has said to you, every answer you gave,
 * and how far you still are from his Throne.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Flame, MessageSquare, Shield } from 'lucide-react';
import type { TauntLog } from '@/types';
import { useGameStore } from '@/state';
import { selectAnsweredTauntCount } from '@/state/selectors';
import { PageShell } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, Progress } from '@/components/ui/misc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarDivider } from '@/components/common/StarDivider';
import { REPLIES, moraleHoursRemaining } from '@/game/iblis/replies';
import { daysUntilNextTaunt, TOTAL_TAUNTS } from '@/game/iblis/taunts';
import { roadProgress } from '@/game/battle/combat';
import { TOTAL_ZONES } from '@/game/constants';
import { relative, formatDay } from '@/lib/date';
import { formatPercent, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function IblisPage() {
  const character = useGameStore((s) => s.character);
  const taunts = useGameStore((s) => s.taunts);
  const answered = useGameStore(selectAnsweredTauntCount);
  const replyToTaunt = useGameStore((s) => s.replyToTaunt);

  const [replying, setReplying] = useState<TauntLog | null>(null);

  if (!character) return null;

  const morale = moraleHoursRemaining(character.morale_buff_expires);
  const nextIn = daysUntilNextTaunt(taunts);
  const progress = roadProgress(character.current_zone, character.current_monster_index);

  return (
    <div className="relative min-h-dvh">
      {/* Ambient presence */}
      <motion.div
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="iblis-smoke pointer-events-none fixed inset-0 blur-3xl"
      />

      <div className="relative">
        <PageShell title="Iblis" subtitle="He has been waiting since before you had a name.">
          {/* Status */}
          <div className="panel framed border-iblis/40 p-4 shadow-iblis">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="He has spoken" value={`${taunts.length}×`} />
              <Stat label="You answered" value={`${answered}×`} />
              <Stat
                label="Next"
                value={nextIn === 0 ? 'Soon' : `${nextIn}d`}
              />
            </div>

            {morale > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald/40 bg-emerald/10 px-3 py-2">
                <Shield className="size-4 shrink-0 text-emerald" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-emerald">
                    Morale +{Math.round(character.morale_buff_percent * 100)}% attack
                  </p>
                  <p className="text-[10px] text-muted">
                    {formatDuration(morale * 3_600_000)} remaining
                  </p>
                </div>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              He speaks at most once a week, never less than five days apart, and never between
              11pm and 8am. You have heard {taunts.length} of his {TOTAL_TAUNTS} lines.
            </p>
          </div>

          {/* Distance to the Throne */}
          <div className="panel mt-4 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="heading-rule">Distance to the Throne</span>
              <span className="tabular text-sm text-iblis">{formatPercent(progress, 2)}</span>
            </div>
            <Progress
              value={progress}
              barClassName="bg-gradient-to-r from-iblis to-[#A855F7]"
              height="h-2.5"
            />
            <p className="mt-2 text-xs text-muted">
              Zone {character.current_zone} of {TOTAL_ZONES}. He sits at 66 with
              999,999,999,999,999,999 HP and has never once been reached.
            </p>
          </div>

          {/* History */}
          <StarDivider label="Everything he has said" className="mt-6" />

          {taunts.length === 0 ? (
            <EmptyState
              icon={<Flame className="size-9" />}
              title="He has not spoken yet"
              description="He is patient. He will. Keep your streak and he will notice you sooner."
            />
          ) : (
            <ol className="space-y-3">
              {taunts.map((taunt) => (
                <li key={taunt.id} className="relative pl-6">
                  <span
                    className={cn(
                      'absolute left-0 top-3 size-2.5 rounded-full',
                      taunt.replied_at ? 'bg-emerald' : 'bg-iblis',
                    )}
                  />
                  <span className="absolute left-[4.5px] top-6 h-full w-px bg-edge" />

                  <div
                    className={cn(
                      'panel p-3.5',
                      taunt.replied_at ? 'border-edge' : 'border-iblis/50',
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
                      <Clock className="size-2.5" />
                      {relative(taunt.fired_at)}
                      <span className="text-muted/40">·</span>
                      {formatDay(taunt.fired_at.slice(0, 10))}
                      {!taunt.replied_at && (
                        <Badge variant="iblis" className="ml-auto">
                          Unanswered
                        </Badge>
                      )}
                    </div>

                    <p className="font-display text-[15px] leading-relaxed text-bone/90">
                      &ldquo;{taunt.taunt_text}&rdquo;
                    </p>

                    {taunt.reply_text ? (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald/30 bg-emerald/[0.07] p-2.5">
                        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-emerald" />
                        <div>
                          <p className="text-sm text-bone">&ldquo;{taunt.reply_text}&rdquo;</p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            You answered {taunt.replied_at ? relative(taunt.replied_at) : ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="iblis"
                        size="sm"
                        className="mt-3"
                        onClick={() => setReplying(taunt)}
                      >
                        Answer him
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </PageShell>
      </div>

      {/* Reply picker */}
      <Dialog open={Boolean(replying)} onOpenChange={(o) => !o && setReplying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your answer</DialogTitle>
            <DialogDescription>
              Answering grants +10% attack for 24 hours. Saying nothing costs you nothing.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {REPLIES.map((reply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => {
                  if (replying) replyToTaunt(reply.id, replying.id);
                  setReplying(null);
                }}
                className="w-full rounded-lg border border-edge bg-card/70 px-4 py-3 text-left text-sm text-bone transition-all hover:border-gold/60 hover:shadow-gold"
              >
                &ldquo;{reply.text}&rdquo;
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-inset p-2.5 text-center">
      <p className="tabular font-display text-lg text-bone">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
