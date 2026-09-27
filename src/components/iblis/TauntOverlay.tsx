/**
 * The Iblis overlay.
 *
 * He is a tempter, not a cartoon villain: no horns, no face, no jokes.
 * Purple smoke enters from the screen edges, the taunt is set large and
 * quiet, and the player answers or closes. Closing costs nothing.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { TauntLog } from '@/types';
import { REPLIES } from '@/game/iblis/replies';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TauntOverlay({
  taunt,
  onReply,
  onDismiss,
}: {
  taunt: TauntLog;
  onReply: (replyId: number) => void;
  onDismiss: () => void;
}) {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Iblis speaks"
    >
      <div className="absolute inset-0 bg-night/96" />

      {/* Smoke from every edge, drifting inward. */}
      <motion.div
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="iblis-smoke absolute inset-0"
      />
      <motion.div
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="iblis-smoke absolute inset-0 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="relative w-full max-w-lg"
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Say nothing"
          className="absolute -top-10 right-0 rounded-md p-2 text-muted/60 transition-colors hover:text-bone"
        >
          <X className="size-5" />
        </button>

        <p className="mb-6 text-center font-display text-xs uppercase tracking-[0.4em] text-[#A78BFA]">
          Iblis speaks
        </p>

        <blockquote className="relative text-center">
          <span className="absolute -left-2 -top-6 font-display text-6xl text-iblis/50">&ldquo;</span>
          <p className="px-4 font-display text-xl leading-relaxed text-bone/95 sm:text-2xl">
            {taunt.taunt_text}
          </p>
          <span className="absolute -bottom-10 -right-2 font-display text-6xl text-iblis/50">
            &rdquo;
          </span>
        </blockquote>

        <div className="mt-14">
          {!showReplies ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="iblis" size="block" onClick={() => setShowReplies(true)}>
                Answer him
              </Button>
              <Button variant="ghost" size="block" onClick={onDismiss}>
                Say nothing
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="mb-3 text-center text-xs text-muted">
                Your answer grants +10% attack for 24 hours.
              </p>
              <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                {REPLIES.map((reply) => (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => onReply(reply.id)}
                    className={cn(
                      'w-full rounded-lg border border-edge bg-card/70 px-4 py-3 text-left text-sm text-bone transition-all',
                      'hover:border-gold/60 hover:bg-card hover:shadow-gold active:scale-[0.99]',
                    )}
                  >
                    &ldquo;{reply.text}&rdquo;
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
