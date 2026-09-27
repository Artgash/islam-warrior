/**
 * Display formatting. Iblis's HP exceeds Number.MAX_SAFE_INTEGER, so large
 * numbers get abbreviated rather than printed in full.
 */

const UNITS = [
  { value: 1e18, suffix: 'Qi' },
  { value: 1e15, suffix: 'Q' },
  { value: 1e12, suffix: 'T' },
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'K' },
];

/** 1234 -> "1.2K", 999999999999999999 -> "1Qi". */
export function abbreviate(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '∞';
  const abs = Math.abs(value);
  if (abs < 1000) return String(Math.round(value));

  for (const unit of UNITS) {
    if (abs >= unit.value) {
      const scaled = value / unit.value;
      const rendered = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(digits);
      return `${trimZeros(rendered)}${unit.suffix}`;
    }
  }

  return String(Math.round(value));
}

function trimZeros(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/** Full separated number, for values small enough to be meaningful. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  return Math.round(value).toLocaleString('en-US');
}

/** Numbers under 1M print in full; larger ones abbreviate. */
export function smartNumber(value: number): string {
  return Math.abs(value) < 1_000_000 ? formatNumber(value) : abbreviate(value);
}

export function formatCoins(value: number): string {
  return smartNumber(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2).replace(/\.00$/, '')}x`;
}

/** "2h 14m" style countdown. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';

  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** "01:23:45" for the weekly reset clock. */
export function formatClock(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Health-bar width as a percentage string, never fully zero until dead. */
export function hpPercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}
