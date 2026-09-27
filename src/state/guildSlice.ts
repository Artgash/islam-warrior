import type { GuildSlice, SliceCreator } from './types';
import { GUILD_CHAT_HISTORY } from '@/game/constants';

export const createGuildSlice: SliceCreator<GuildSlice> = (set, get) => ({
  guildId: null,
  guild: null,
  members: [],
  messages: [],

  setGuild: (guild) => set({ guild, guildId: guild?.id ?? null }),

  setMembers: (members) => set({ members }),

  setMessages: (messages) => set({ messages: messages.slice(-GUILD_CHAT_HISTORY) }),

  appendMessage: (message) =>
    set((state) => {
      // Realtime can echo a message the sender already appended optimistically.
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message].slice(-GUILD_CHAT_HISTORY) };
    }),

  leaveCurrentGuild: () => {
    set({ guild: null, guildId: null, members: [], messages: [] });
    get().pushNotification({
      type: 'guild',
      title: 'Guild left',
      body: 'You walk alone again. You can join another at any time.',
    });
  },
});
