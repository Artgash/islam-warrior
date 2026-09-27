import type { IblisReply, ISOTimestamp } from '@/types';
import { MORALE_BUFF_HOURS } from '@/game/constants';

/**
 * Answering a taunt costs nothing and grants +10% attack for 24 hours.
 * The point is defiance, not optimisation.
 */
export const REPLIES: IblisReply[] = [
  { id: 1, text: "I haven't even started.", morale_percent: 0.1 },
  { id: 2, text: 'Watch me.', morale_percent: 0.1 },
  { id: 3, text: 'Allah is with me — you are nothing.', morale_percent: 0.1 },
  { id: 4, text: "Keep talking. I'm coming for you.", morale_percent: 0.1 },
  { id: 5, text: "You fear me — that's why you talk.", morale_percent: 0.1 },
  { id: 6, text: 'This is only round one.', morale_percent: 0.1 },
  { id: 7, text: 'I will bury you at Zone 66.', morale_percent: 0.1 },
  { id: 8, text: 'Your whispers bounce off my shield.', morale_percent: 0.1 },
  { id: 9, text: 'I fight for something greater than myself.', morale_percent: 0.1 },
  { id: 10, text: 'See you at the Throne.', morale_percent: 0.1 },
];

const REPLY_BY_ID = new Map<number, IblisReply>(REPLIES.map((r) => [r.id, r]));

export function getReply(id: number): IblisReply | undefined {
  return REPLY_BY_ID.get(id);
}

export interface MoraleBuff {
  percent: number;
  expires_at: ISOTimestamp;
}

/** Build the 24-hour morale buff granted by a reply. */
export function buildMoraleBuff(replyId: number, now: Date = new Date()): MoraleBuff | null {
  const reply = getReply(replyId);
  if (!reply) return null;

  const expires = new Date(now.getTime() + MORALE_BUFF_HOURS * 3_600_000);
  return { percent: reply.morale_percent, expires_at: expires.toISOString() };
}

/** Hours left on a morale buff, or 0 when none is active. */
export function moraleHoursRemaining(
  expiresAt: ISOTimestamp | null,
  now: Date = new Date(),
): number {
  if (!expiresAt) return 0;
  const remaining = (new Date(expiresAt).getTime() - now.getTime()) / 3_600_000;
  return Math.max(0, remaining);
}

export function isMoraleActive(expiresAt: ISOTimestamp | null, now: Date = new Date()): boolean {
  return moraleHoursRemaining(expiresAt, now) > 0;
}
