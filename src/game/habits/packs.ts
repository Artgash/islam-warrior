import type { HabitPack, HabitTemplate } from '@/types';

/**
 * The starter packs.
 *
 * DESIGN RULE: every habit here must be answerable as an honest yes/no at
 * the end of a day, by the person themselves, with no interpretation. That
 * is the whole contract the game rests on - a habit you can fudge is a habit
 * that quietly corrupts your damage numbers.
 *
 * Two entries from the original set were cut for failing that test:
 *   - "Compliment someone"     : no threshold; did a nod count?
 *   - "Talk to someone new"    : same problem, and it punishes days spent
 *                                alone for legitimate reasons.
 * Both are replaced by sharper equivalents below.
 *
 * Everything else was kept and the packs roughly doubled.
 */

/* ------------------------------------------------------------------ */
/* Faith                                                               */
/* ------------------------------------------------------------------ */

export const MUSLIM_PACK: HabitPack = {
  id: 'pack_muslim',
  name: 'The Muslim Pack',
  arabic: 'العبادات',
  description: 'The spine of a warrior day. Feeds Faith.',
  category: 'faith',
  habits: [
    { name: 'Fajr prayer', category: 'faith', intensity: 5, cue_trigger: 'Before sunrise' },
    { name: 'Dhuhr prayer', category: 'faith', intensity: 3, cue_trigger: 'Midday' },
    { name: 'Asr prayer', category: 'faith', intensity: 3, cue_trigger: 'Afternoon' },
    { name: 'Maghrib prayer', category: 'faith', intensity: 3, cue_trigger: 'At sunset' },
    { name: 'Isha prayer', category: 'faith', intensity: 3, cue_trigger: 'Night' },
    { name: 'Prayed on time, not late', category: 'faith', intensity: 4, description: 'All five within their proper window.' },
    { name: 'Prayed in congregation', category: 'faith', intensity: 4, cue_trigger: 'At the masjid' },
    { name: 'Sunnah prayers', category: 'faith', intensity: 3, description: 'The rawatib around the obligatory prayers.' },
    { name: 'Tahajjud', category: 'faith', intensity: 5, cue_trigger: 'Last third of the night' },
    { name: 'Witr before sleep', category: 'faith', intensity: 2, cue_trigger: 'Before bed' },
    { name: 'Duha prayer', category: 'faith', intensity: 2, cue_trigger: 'Mid-morning' },

    { name: 'Quran 10 min', category: 'faith', intensity: 3, cue_trigger: 'After Fajr' },
    { name: 'Quran 1 juz', category: 'faith', intensity: 5, cue_trigger: 'After Fajr' },
    { name: 'Memorised 3 new ayat', category: 'faith', intensity: 4 },
    { name: 'Revised my hifz', category: 'faith', intensity: 3 },
    { name: 'Read Quran with tafsir', category: 'faith', intensity: 4, description: 'Not just recitation — understanding.' },
    { name: 'Surah al-Kahf (Friday)', category: 'faith', intensity: 3, cue_trigger: 'Friday' },

    { name: 'Morning adhkar', category: 'faith', intensity: 2, cue_trigger: 'After Fajr' },
    { name: 'Evening adhkar', category: 'faith', intensity: 2, cue_trigger: 'After Asr' },
    { name: 'Dua before sleep', category: 'faith', intensity: 1, cue_trigger: 'Before bed' },
    { name: 'Salawat 100x', category: 'faith', intensity: 2 },
    { name: 'Istighfar 100x', category: 'faith', intensity: 2 },
    { name: 'Dhikr after every prayer', category: 'faith', intensity: 2 },
    { name: 'Made dua for someone else', category: 'faith', intensity: 1 },

    { name: 'Charity (sadaqah)', category: 'faith', intensity: 3 },
    { name: 'Fasting (Mon/Thu)', category: 'faith', intensity: 5, cue_trigger: 'Before Fajr' },
    { name: 'Fasting Ayyam al-Beed', category: 'faith', intensity: 5, description: 'The 13th, 14th and 15th of the lunar month.' },
    { name: 'Learned one new thing about the deen', category: 'faith', intensity: 2 },
    { name: 'Attended a halaqah or lecture', category: 'faith', intensity: 3 },
    { name: 'Visited the masjid', category: 'faith', intensity: 2 },
  ],
};

/* ------------------------------------------------------------------ */
/* Intelligence                                                        */
/* ------------------------------------------------------------------ */

export const INTELLIGENCE_PACK: HabitPack = {
  id: 'pack_intelligence',
  name: 'The Scholar Pack',
  arabic: 'العلم',
  description: 'The pen outlives the sword. Feeds Intelligence.',
  category: 'intelligence',
  habits: [
    { name: 'Read 20 min', category: 'intelligence', intensity: 2 },
    { name: 'Read 60 min', category: 'intelligence', intensity: 4 },
    { name: 'Finished a book chapter', category: 'intelligence', intensity: 3 },
    { name: 'Study session 45 min', category: 'intelligence', intensity: 4 },
    { name: 'Deep study 2 hours', category: 'intelligence', intensity: 5 },
    { name: 'Learn a language 15 min', category: 'intelligence', intensity: 3 },
    { name: 'Arabic study 20 min', category: 'intelligence', intensity: 3 },
    { name: 'Memorize something new', category: 'intelligence', intensity: 3 },
    { name: 'Practice a skill 30 min', category: 'intelligence', intensity: 3 },
    { name: 'Wrote code for 1 hour', category: 'intelligence', intensity: 4 },
    { name: 'Journal 10 min', category: 'intelligence', intensity: 2, cue_trigger: 'Before bed' },
    { name: 'Wrote down what I learned today', category: 'intelligence', intensity: 2, cue_trigger: 'Before bed' },
    { name: 'Watch educational video', category: 'intelligence', intensity: 1 },
    { name: 'Taught someone something', category: 'intelligence', intensity: 3, description: 'The fastest way to find out what you do not know.' },
    { name: 'Reviewed yesterday’s notes', category: 'intelligence', intensity: 2 },
    { name: 'Solved a hard problem', category: 'intelligence', intensity: 4 },
    { name: 'Read something I disagree with', category: 'intelligence', intensity: 3 },
  ],
};

/* ------------------------------------------------------------------ */
/* Strength                                                            */
/* ------------------------------------------------------------------ */

export const STRENGTH_PACK: HabitPack = {
  id: 'pack_strength',
  name: 'The Body Pack',
  arabic: 'القوة',
  description: 'The strong believer is better than the weak one. Feeds Strength.',
  category: 'strength',
  habits: [
    { name: 'Workout 45 min', category: 'strength', intensity: 4 },
    { name: 'Lifted weights', category: 'strength', intensity: 4 },
    { name: 'Trained to failure', category: 'strength', intensity: 5 },
    { name: 'Calisthenics session', category: 'strength', intensity: 3 },
    { name: 'Ran 5km', category: 'strength', intensity: 4 },
    { name: 'Walk 30 min', category: 'strength', intensity: 2 },
    { name: '10,000 steps', category: 'strength', intensity: 3 },
    { name: 'Combat sport training', category: 'strength', intensity: 5, description: 'Boxing, wrestling, BJJ, archery.' },
    { name: 'Swim session', category: 'strength', intensity: 4 },
    { name: 'Stretch 10 min', category: 'strength', intensity: 1 },
    { name: 'Mobility work', category: 'strength', intensity: 2 },

    { name: 'Drink 2L water', category: 'strength', intensity: 2 },
    { name: 'Ate enough protein', category: 'strength', intensity: 3 },
    { name: 'Ate real food only', category: 'strength', intensity: 3, description: 'Nothing from a packet with a long ingredient list.' },
    { name: 'No eating after Isha', category: 'strength', intensity: 3 },
    { name: 'Sleep 8 hours', category: 'strength', intensity: 3 },
    { name: 'In bed before 11pm', category: 'strength', intensity: 4 },
    { name: 'No screens an hour before bed', category: 'strength', intensity: 3, cue_trigger: 'Before bed' },
    // "Cold shower" lives in the Discipline pack, not here - it is an act of
    // will before it is an act of the body, and a habit must appear once.
    { name: 'Sunlight within an hour of waking', category: 'strength', intensity: 2 },
    { name: 'Took a rest day properly', category: 'strength', intensity: 2, description: 'Recovery is training. Log it honestly.' },
  ],
};

/* ------------------------------------------------------------------ */
/* Charisma                                                            */
/* ------------------------------------------------------------------ */

export const CHARISMA_PACK: HabitPack = {
  id: 'pack_charisma',
  name: 'The Character Pack',
  arabic: 'الأخلاق',
  description: 'The best of you are best to others. Feeds Charisma.',
  category: 'charisma',
  habits: [
    { name: 'Called my parents', category: 'charisma', intensity: 2 },
    { name: 'Called family', category: 'charisma', intensity: 2 },
    { name: 'Visited a relative', category: 'charisma', intensity: 3, description: 'Silat ar-rahm — keeping the ties.' },
    { name: 'Checked on a friend', category: 'charisma', intensity: 2 },
    { name: 'Reconnected with someone I had drifted from', category: 'charisma', intensity: 4 },

    { name: 'Helped someone with something specific', category: 'charisma', intensity: 2, description: 'A named person, a real task.' },
    { name: 'Gave a gift', category: 'charisma', intensity: 2 },
    { name: 'Said something kind out loud to a specific person', category: 'charisma', intensity: 1, description: 'Replaces the old "compliment someone" — this one you can actually score.' },
    { name: 'Had a real conversation, phone away', category: 'charisma', intensity: 3, description: 'Replaces "talk to someone new" — presence, not novelty.' },
    { name: 'Listened without interrupting', category: 'charisma', intensity: 3 },
    { name: 'Apologised when I was wrong', category: 'charisma', intensity: 4 },
    { name: 'Forgave someone', category: 'charisma', intensity: 4 },
    { name: 'Let an argument go', category: 'charisma', intensity: 3 },
    { name: 'Public speaking practice', category: 'charisma', intensity: 4 },
    { name: 'Smiled at someone', category: 'charisma', intensity: 1, description: 'A sunnah, and free.' },
    { name: 'Fed someone', category: 'charisma', intensity: 2 },
    { name: 'Defended someone who was absent', category: 'charisma', intensity: 4 },
  ],
};

/* ------------------------------------------------------------------ */
/* Discipline                                                          */
/* ------------------------------------------------------------------ */

export const DISCIPLINE_PACK: HabitPack = {
  id: 'pack_discipline',
  name: 'The Discipline Pack',
  arabic: 'الانضباط',
  description: 'Rule the hours or the hours rule you. Feeds Endurance.',
  category: 'discipline',
  habits: [
    { name: 'Wake before Fajr', category: 'discipline', intensity: 4 },
    { name: 'Out of bed within 5 minutes', category: 'discipline', intensity: 3, cue_trigger: 'On waking' },
    { name: 'No phone first hour', category: 'discipline', intensity: 3, cue_trigger: 'On waking' },
    { name: 'Make bed', category: 'discipline', intensity: 1, cue_trigger: 'On waking' },
    { name: 'Cold shower', category: 'discipline', intensity: 3 },

    { name: 'Deep work 90 min', category: 'discipline', intensity: 4 },
    { name: 'Deep work 3 hours', category: 'discipline', intensity: 5 },
    { name: 'Single-tasked, no tab hopping', category: 'discipline', intensity: 3 },
    { name: 'Phone in another room while working', category: 'discipline', intensity: 3 },
    { name: 'Finished the hardest task first', category: 'discipline', intensity: 4 },
    { name: 'Inbox to zero', category: 'discipline', intensity: 2 },

    { name: 'Plan tomorrow', category: 'discipline', intensity: 2, cue_trigger: 'Before bed' },
    { name: 'Wrote my top 3 for the day', category: 'discipline', intensity: 2, cue_trigger: 'Morning' },
    { name: 'Did all three of my top 3', category: 'discipline', intensity: 4 },
    { name: 'No social media until noon', category: 'discipline', intensity: 3 },
    { name: 'Kept a promise I made to myself', category: 'discipline', intensity: 4 },
    { name: 'Tidied my space', category: 'discipline', intensity: 1 },
    { name: 'Tracked every hour today', category: 'discipline', intensity: 3 },
    { name: 'Said no to something', category: 'discipline', intensity: 3 },
  ],
};

/* ------------------------------------------------------------------ */
/* Resistance                                                          */
/* ------------------------------------------------------------------ */

export const BAD_HABIT_PACK: HabitPack = {
  id: 'pack_resistance',
  name: 'Chains to Break',
  arabic: 'ترك المحرمات',
  description: 'Every day resisted raises your guard. Feeds Defense, pays triple.',
  category: 'bad_habit',
  habits: [
    { name: 'No porn', category: 'bad_habit', intensity: 5 },
    { name: 'No masturbation', category: 'bad_habit', intensity: 5 },
    { name: 'Lowered my gaze', category: 'bad_habit', intensity: 4 },
    { name: 'No music', category: 'bad_habit', intensity: 5 },
    { name: 'No smoking', category: 'bad_habit', intensity: 5 },
    { name: 'No vaping', category: 'bad_habit', intensity: 4 },
    { name: 'No alcohol', category: 'bad_habit', intensity: 5 },
    { name: 'No gambling', category: 'bad_habit', intensity: 5 },

    { name: 'No lying', category: 'bad_habit', intensity: 5 },
    { name: 'No backbiting', category: 'bad_habit', intensity: 4 },
    { name: 'No gossip', category: 'bad_habit', intensity: 4 },
    { name: 'No swearing', category: 'bad_habit', intensity: 3 },
    { name: 'No anger outbursts', category: 'bad_habit', intensity: 4 },
    { name: 'No arguing to win', category: 'bad_habit', intensity: 3 },
    { name: 'No complaining out loud', category: 'bad_habit', intensity: 3 },
    { name: 'No breaking a promise', category: 'bad_habit', intensity: 4 },

    { name: 'No doomscrolling', category: 'bad_habit', intensity: 3 },
    { name: 'No short-form video', category: 'bad_habit', intensity: 4, description: 'Reels, TikTok, Shorts.' },
    { name: 'No social media at all', category: 'bad_habit', intensity: 4 },
    { name: 'No checking my phone in bed', category: 'bad_habit', intensity: 3 },
    { name: 'No wasting time', category: 'bad_habit', intensity: 3 },
    { name: 'No oversleeping past Fajr', category: 'bad_habit', intensity: 4 },
    { name: 'No junk food', category: 'bad_habit', intensity: 3 },
    { name: 'No energy drinks', category: 'bad_habit', intensity: 2 },
    { name: 'No snacking after Isha', category: 'bad_habit', intensity: 3 },
    { name: 'No impulse purchases', category: 'bad_habit', intensity: 3 },
    { name: 'No showing off what I did today', category: 'bad_habit', intensity: 4, description: 'Riya. The hardest one on this list.' },
  ],
};

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const HABIT_PACKS: HabitPack[] = [
  MUSLIM_PACK,
  INTELLIGENCE_PACK,
  STRENGTH_PACK,
  CHARISMA_PACK,
  DISCIPLINE_PACK,
  BAD_HABIT_PACK,
];

export function getPack(id: string): HabitPack | undefined {
  return HABIT_PACKS.find((p) => p.id === id);
}

/** Every template across every pack - used by the in-app habit library. */
export function allTemplates(): HabitTemplate[] {
  return HABIT_PACKS.flatMap((p) => p.habits);
}

export const TOTAL_TEMPLATES = HABIT_PACKS.reduce((sum, p) => sum + p.habits.length, 0);

/**
 * A sensible starter selection for players who skip customisation.
 * Deliberately three, deliberately small: the commonest way to fail at this
 * is to start with twenty habits and keep none of them.
 */
export const RECOMMENDED_STARTERS: HabitTemplate[] = [
  MUSLIM_PACK.habits[0], // Fajr prayer
  MUSLIM_PACK.habits[11], // Quran 10 min
  STRENGTH_PACK.habits[5], // Walk 30 min
];
