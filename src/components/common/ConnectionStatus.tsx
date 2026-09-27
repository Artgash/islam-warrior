/**
 * Shows whether the app is talking to a real backend or running on this
 * device alone, and surfaces sync failures.
 *
 * This exists because sync used to fail silently. A player could be signed
 * in, see a leaderboard, and have no idea that nothing was reaching the
 * server. If the cloud is broken the app now says so, in plain words, with
 * the actual database error attached.
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
            Your account and progress live in this browser only. Leaderboards show a generated
            practice ladder, not real players, and guild chat is not live.
          </p>
          <p className="mt-1.5 text-xs text-muted/70">
            Add <code className="text-gold">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-gold">VITE_SUPABASE_ANON_KEY</code> to connect a real database.
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
            You are signed in, but writes to <span className="text-bone">{error.table}</span> are
            being rejected. Your progress is safe on this device and will sync once this is fixed.
          </p>
          <p className="mt-1.5 break-words rounded border border-edge bg-night/60 px-2 py-1 font-mono text-[10px] text-danger/90">
            {error.code ? `[${error.code}] ` : ''}
            {error.message}
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
      <span className="stat-chip border-danger/50 text-danger" title={error.message}>
        <AlertTriangle className="size-3" />
        Sync error
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
