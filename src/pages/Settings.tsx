/**
 * Settings: account, notifications, per-habit reminders, sound, language
 * and the destructive actions, kept behind explicit confirmation.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, LogOut, Trash2 } from 'lucide-react';
import type { NotificationType } from '@/types';
import { useGameStore } from '@/state';
import { PageShell } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge, Separator, Switch } from '@/components/ui/misc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarDivider } from '@/components/common/StarDivider';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';
import { deleteAccount, signOut, updatePassword } from '@/api/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { setMusicEnabled, setSoundEnabled } from '@/platform/sound';
import { CATEGORY_COLORS } from '@/components/battle/MoveButton';

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  habit_reminder: 'Habit reminders',
  iblis_taunt: 'Iblis speaks',
  rank_change: 'Rank changes',
  guild: 'Guild activity',
  season: 'Season updates',
  reward: 'Rewards and achievements',
  system: 'Level-ups and system',
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const habits = useGameStore((s) => s.habits);
  const updateHabit = useGameStore((s) => s.updateHabit);
  const resetAll = useGameStore((s) => s.resetAll);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const onSignOut = async () => {
    await signOut();
    useGameStore.getState().signOutLocal();
    navigate('/auth', { replace: true });
  };

  const onDelete = async () => {
    if (!user) return;
    try {
      await deleteAccount(user.id);
      resetAll();
      toast.success('Account deleted.');
      navigate('/auth', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the account.');
    }
  };

  return (
    <PageShell title="Settings">
      {/* Connection -------------------------------------------------- */}
      <StarDivider label="Connection" />
      <ConnectionStatus />

      {/* Account ---------------------------------------------------- */}
      <StarDivider label="Account" className="mt-6" />

      <div className="panel space-y-3 p-4">
        <div>
          <Label>Email</Label>
          <p className="text-sm text-bone">{user?.email ?? 'Not signed in'}</p>
        </div>

        {isSupabaseConfigured ? (
          <div>
            <Label htmlFor="new-password">Change password</Label>
            <div className="flex gap-2">
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
              <Button
                variant="secondary"
                disabled={newPassword.length < 8}
                onClick={async () => {
                  try {
                    await updatePassword(newPassword);
                    setNewPassword('');
                    toast.success('Password updated.');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed.');
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-edge bg-night/50 px-3 py-2 text-[11px] text-muted">
            Running in local mode — your account exists only in this browser. Add Supabase
            credentials for real accounts, password resets and cloud backup.
          </p>
        )}

        <Button variant="secondary" size="block" onClick={onSignOut}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>

      {/* Notifications ---------------------------------------------- */}
      <StarDivider label="Notifications" className="mt-6" />

      <div className="panel divide-y divide-edge p-0">
        {(Object.keys(NOTIFICATION_LABELS) as NotificationType[]).map((type) => (
          <div key={type} className="flex items-center justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <p className="text-sm text-bone">{NOTIFICATION_LABELS[type]}</p>
              {type === 'iblis_taunt' && (
                <p className="text-[11px] text-muted">At most once a week. Never at night.</p>
              )}
            </div>
            <Switch
              checked={settings.notifications[type]}
              onCheckedChange={(checked) =>
                updateSettings({ notifications: { ...settings.notifications, [type]: checked } })
              }
              aria-label={NOTIFICATION_LABELS[type]}
            />
          </div>
        ))}
      </div>

      {/* Reminders -------------------------------------------------- */}
      <StarDivider label="Habit reminders" className="mt-6" />

      {habits.length === 0 ? (
        <p className="panel p-4 text-center text-sm text-muted">No habits to remind you about.</p>
      ) : (
        <div className="panel divide-y divide-edge p-0">
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-bone">{habit.name}</p>
                <p
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: CATEGORY_COLORS[habit.category] }}
                >
                  {habit.cue_trigger ?? 'No cue set'}
                </p>
              </div>
              <Input
                type="time"
                value={habit.cue_time ?? ''}
                onChange={(e) => updateHabit(habit.id, { cue_time: e.target.value || null })}
                className="h-9 w-[120px]"
                aria-label={`Reminder time for ${habit.name}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Experience -------------------------------------------------- */}
      <StarDivider label="Experience" className="mt-6" />

      <div className="panel divide-y divide-edge p-0">
        <Row
          label="Sound effects"
          description="Sword hits, chimes, monster deaths."
          checked={settings.sound_enabled}
          onChange={(v) => {
            updateSettings({ sound_enabled: v });
            setSoundEnabled(v);
          }}
        />
        <Row
          label="Ambient music"
          description="A ney flute loop in the menus."
          checked={settings.music_enabled}
          onChange={(v) => {
            updateSettings({ music_enabled: v });
            setMusicEnabled(v);
          }}
        />
        <Row
          label="Confirm before each move"
          description="Asks 'did you really do this?' before every strike. Recommended — the whole system rests on honesty."
          checked={settings.confirm_before_move}
          onChange={(v) => updateSettings({ confirm_before_move: v })}
        />
        <Row
          label="Reduce motion"
          description="Cuts screen shake and large animations."
          checked={settings.reduce_motion}
          onChange={(v) => updateSettings({ reduce_motion: v })}
        />

        <div className="flex items-center justify-between gap-3 p-3.5">
          <div>
            <p className="text-sm text-bone">Language</p>
            <p className="text-[11px] text-muted">Arabic support is partial — names and ranks.</p>
          </div>
          <div className="flex gap-1">
            {(['en', 'ar'] as const).map((lang) => (
              <Button
                key={lang}
                size="sm"
                variant={settings.language === lang ? 'default' : 'ghost'}
                onClick={() => updateSettings({ language: lang })}
              >
                {lang === 'en' ? 'English' : 'العربية'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-3.5">
          <div>
            <p className="text-sm text-bone">Theme</p>
            <p className="text-[11px] text-muted">Dark only. This game happens at night.</p>
          </div>
          <Badge>Dark</Badge>
        </div>
      </div>

      {/* Legal ------------------------------------------------------- */}
      <StarDivider label="Legal" className="mt-6" />

      <div className="panel divide-y divide-edge p-0">
        <a href="/terms" className="block p-3.5 text-sm text-bone hover:text-gold">
          Terms of service
        </a>
        <a href="/privacy" className="block p-3.5 text-sm text-bone hover:text-gold">
          Privacy policy
        </a>
      </div>

      {/* Danger ------------------------------------------------------ */}
      <StarDivider label="Danger" className="mt-6" />

      <div className="panel border-danger/40 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="font-display text-sm text-bone">Delete your account</p>
            <p className="mt-1 text-xs text-muted">
              Every habit, log, item and all zone progress is erased. This cannot be undone.
            </p>
          </div>
        </div>

        <Separator className="my-3" />

        <Button variant="danger" size="block" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" />
          Delete account
        </Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete everything?</DialogTitle>
            <DialogDescription>
              This erases your character, every habit, every log, your inventory and all
              progress along the road. There is no recovery.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep my account
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Row({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5">
      <div className="min-w-0">
        <p className="text-sm text-bone">{label}</p>
        <p className="text-[11px] leading-relaxed text-muted">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
