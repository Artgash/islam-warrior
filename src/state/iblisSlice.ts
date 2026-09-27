import type { TauntLog } from '@/types';
import type { IblisSlice, SliceCreator } from './types';
import { canFireTaunt, pendingTaunt, selectTaunt } from '@/game/iblis/taunts';
import { buildMoraleBuff, getReply } from '@/game/iblis/replies';
import { uuid } from '@/lib/utils';
import { nowTimestamp } from '@/lib/date';
import { play } from '@/platform/sound';
import { pushTauntLog } from '@/api/sync';

export const createIblisSlice: SliceCreator<IblisSlice> = (set, get) => ({
  taunts: [],
  activeTaunt: null,

  /**
   * Called opportunistically after meaningful actions. The cadence rules
   * live in the pure layer: at most one per week, never inside quiet hours.
   */
  maybeFireTaunt: () => {
    const state = get();
    if (!state.character) return;
    if (state.activeTaunt) return;

    // A dismissed taunt is not re-shown. It stays unanswered in the Iblis
    // tab, where it can still be answered later, and the five-day gap
    // measured from `fired_at` keeps the next one from arriving early.
    if (!canFireTaunt(state.taunts)) return;

    get().forceFireTaunt();
  },

  forceFireTaunt: () => {
    const state = get();
    const character = state.character;
    if (!character) return;

    const taunt = selectTaunt(state.taunts);

    const log: TauntLog = {
      id: uuid(),
      user_id: character.user_id,
      taunt_id: taunt.id,
      taunt_text: taunt.text,
      fired_at: nowTimestamp(),
      replied_at: null,
      reply_id: null,
      reply_text: null,
    };

    set((s) => ({ taunts: [log, ...s.taunts], activeTaunt: log }));
    play('iblis_whisper', 0.5);
    void pushTauntLog(log);

    get().pushNotification({
      type: 'iblis_taunt',
      title: 'Iblis speaks',
      body: taunt.text,
    });
  },

  replyToTaunt: (replyId, tauntId) => {
    const state = get();
    const target = tauntId
      ? state.taunts.find((t) => t.id === tauntId)
      : (state.activeTaunt ?? pendingTaunt(state.taunts));
    const reply = getReply(replyId);
    if (!target || !reply) return;

    const active = target;

    const buff = buildMoraleBuff(replyId);
    const answered: TauntLog = {
      ...active,
      replied_at: nowTimestamp(),
      reply_id: reply.id,
      reply_text: reply.text,
    };

    set((s) => ({
      taunts: s.taunts.map((t) => (t.id === active.id ? answered : t)),
      activeTaunt: null,
    }));

    if (buff) {
      get().updateCharacter({
        morale_buff_percent: buff.percent,
        morale_buff_expires: buff.expires_at,
      });
    }

    void pushTauntLog(answered);
    get().evaluateAchievements();

    get().pushNotification({
      type: 'system',
      title: 'Morale raised',
      body: `You answered: "${reply.text}" — +${Math.round(reply.morale_percent * 100)}% attack for 24 hours.`,
    });
  },

  /**
   * Closing the overlay without answering. The taunt stays unanswered in
   * history and blocks the next one, so silence has a cost — but no penalty.
   */
  dismissTaunt: () => set({ activeTaunt: null }),
});
