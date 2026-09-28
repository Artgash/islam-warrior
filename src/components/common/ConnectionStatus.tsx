/**
 * Shows whether the app is talking to a real backend or running on this
 * device alone, and surfaces sync failures.
 *
 * This exists because sync used to fail silently. A player could be signed
 * in, see a leaderboard, and have no idea that nothing was reaching the
 * server. If the cloud is broken the app says so, in plain words.
 *
 * Deliberately no table names, error codes or database messages. They mean
 * nothing to a player, they describe infrastructure that is not theirs, and
 * the person who can act on them is reading the console, not this panel -
 * which is where `reportSyncError` still logs them in full.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, CloudOff, Cloud, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getSyncHealth, onSyncError, type SyncError } from '@/api/sync';
import { useGameStore } from '@/state';
import { cn } from '@/lib/utils';

export function ConnectionStatus({ className }: { className?: string }) {
  const user = useGameStore((s) => s.user);
  const [error, setError] = useState<SyncError | null>(() => getSyncHealth().lastError);

  useEffect(() => onSyncError(setError), []);

  /* ---------------- Local mode ---------------- */

  if (!isSupabaseConfigured) {
    return (
      <div className={cn('panel flex items-start gap-3 p-3.5', className)}>
        <CloudOff className="mt-0.5 size-5 shrink-0 text-muted" />
        <div className="min-w-0">
          <p className="font-display text-sm text-bone">Local mode</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Your account and progress live in this browser only. Leaderboards show a practice
            ladder, not real players, and guild chat is not live.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- Connected but failing ---------------- */

  if (error) {
    return (
      <div className={cn('panel flex items-start gap-3 border-danger/50 p-3.5', className)}>
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
        <div className="min-w-0">
          <p className="font-display text-sm text-bone">Cloud sync is failing</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Your progress is safe on this device, but it is not reaching the server right now.
            It will sync by itself once the connection recovers.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- Connected ---------------- */

  return (
    <div className={cn('panel flex items-start gap-3 border-emerald/40 p-3.5', className)}>
      {user ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald" />
      ) : (
        <Cloud className="mt-0.5 size-5 shrink-0 text-muted" />
      )}
      <div className="min-w-0">
        <p className="font-display text-sm text-bone">
          {user ? 'Connected' : 'Cloud ready'}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {user
            ? 'Progress syncs across your devices. Leaderboards and guilds show real players.'
            : 'A database is configured. Sign in to sync your progress.'}
        </p>
      </div>
    </div>
  );
}

/** One-line variant for headers. */
export function ConnectionPill() {
  const [error, setError] = useState<SyncError | null>(() => getSyncHealth().lastError);
  useEffect(() => onSyncError(setError), []);

  if (!isSupabaseConfigured) {
    return (
      <span className="stat-chip text-muted" title="Progress is stored in this browser only">
        <CloudOff className="size-3" />
        Local
      </span>
    );
  }

  if (error) {
    return (
      <span className="stat-chip border-danger/50 text-danger" title="Not syncing right now">
        <AlertTriangle className="size-3" />
        Not synced
      </span>
    );
  }

  return (
    <span className="stat-chip border-emerald/40 text-emerald" title="Syncing to the cloud">
      <Cloud className="size-3" />
      Synced
    </span>
  );
}
