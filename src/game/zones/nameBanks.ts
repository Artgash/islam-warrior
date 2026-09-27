/**
 * Per-zone vocabulary used to compose monster names.
 *
 * Each zone supplies 5 theme adjectives and 8 creature forms. The composer in
 * `monsters.ts` walks them with a co-prime stride, which yields 15 unique,
 * on-theme names per zone without hand-authoring 990 strings.
 *
 * Zone 1 additionally ships an authored override list so the opening zone
 * reads exactly as designed.
 */

export interface NameBank {
  adjectives: [string, string, string, string, string];
  nouns: [string, string, string, string, string, string, string, string];
}

/** Authored names for the very first zone the player ever sees. */
export const ZONE_1_AUTHORED: string[] = [
  'Yawning Imp',
  'Drowsy Shade',
  'Couch Spirit',
  'Blanket Fiend',
  'Snack Demon',
  'Scroll Gremlin',
  'Habit Wraith',
  'Nafs Whisper',
  'Morning Sloth',
  'Snooze Elemental',
  'Distraction Sprite',
  'Bed Mimic',
  'Comfort Phantasm',
  'Delay Wisp',
  'Lazy Giant',
];

export const NAME_BANKS: Record<number, NameBank> = {
  1: {
    adjectives: ['Yawning', 'Drowsy', 'Idle', 'Sluggish', 'Lazy'],
    nouns: ['Imp', 'Shade', 'Spirit', 'Fiend', 'Gremlin', 'Wraith', 'Sprite', 'Phantasm'],
  },
  2: {
    adjectives: ['Deferred', 'Stalling', 'Dawdling', 'Unstarted', 'Postponed'],
    nouns: ['Husk', 'Drifter', 'Mirage', 'Sandling', 'Loiterer', 'Vagrant', 'Hourling', 'Wisp'],
  },
  3: {
    adjectives: ['Murmuring', 'Hissing', 'Doubting', 'Creeping', 'Hollow'],
    nouns: ['Whisperer', 'Echo', 'Voice', 'Shade', 'Rustler', 'Susurrus', 'Stalker', 'Chanter'],
  },
  4: {
    adjectives: ['Preening', 'Haughty', 'Gilded', 'Swollen', 'Lofty'],
    nouns: ['Sentry', 'Herald', 'Warden', 'Peacock', 'Captain', 'Statue', 'Banner', 'Marshal'],
  },
  5: {
    adjectives: ['Endless', 'Glowing', 'Numbing', 'Flickering', 'Drowning'],
    nouns: ['Feeder', 'Tide', 'Kelp', 'Leech', 'Siren', 'Undertow', 'Current', 'Shoal'],
  },
  6: {
    adjectives: ['Slumbering', 'Heavy-Lidded', 'Dreaming', 'Numb', 'Unwaking'],
    nouns: ['Beast', 'Dozer', 'Cocoon', 'Moth', 'Bat', 'Recluse', 'Hollow', 'Lurker'],
  },
  7: {
    adjectives: ['Gilded', 'Grasping', 'Hoarding', 'Bartering', 'Glittering'],
    nouns: ['Serpent', 'Merchant', 'Coinling', 'Broker', 'Magpie', 'Usurer', 'Peddler', 'Vault'],
  },
  8: {
    adjectives: ['Seething', 'Blood-Eyed', 'Roaring', 'Snapping', 'Boiling'],
    nouns: ['Brute', 'Gladiator', 'Titan', 'Berserker', 'Mauler', 'Bull', 'Champion', 'Hound'],
  },
  9: {
    adjectives: ['Perfumed', 'Blooming', 'Silken', 'Honeyed', 'Thorned'],
    nouns: ['Serpent', 'Vine', 'Nymph', 'Orchid', 'Tempter', 'Blossom', 'Coil', 'Snare'],
  },
  10: {
    adjectives: ['Unsettled', 'Questioning', 'Faithless', 'Inkstained', 'Contradicting'],
    nouns: ['Djinn', 'Scholar', 'Tome', 'Skeptic', 'Riddler', 'Archivist', 'Footnote', 'Heretic'],
  },
  11: {
    adjectives: ['Grinding', 'Stone-Backed', 'Weathered', 'Crushing', 'Unyielding'],
    nouns: ['Giant', 'Climber', 'Boulder', 'Gale', 'Cragling', 'Yeti', 'Slab', 'Avalanche'],
  },
  12: {
    adjectives: ['Weeping', 'Backward', 'Drowned', 'Mourning', 'Returning'],
    nouns: ['Wraith', 'Current', 'Memory', 'Ferryman', 'Silt', 'Reflection', 'Eddy', 'Revenant'],
  },
  13: {
    adjectives: ['Green-Eyed', 'Covetous', 'Withering', 'Bitter', 'Root-Bound'],
    nouns: ['Shade', 'Bramble', 'Dryad', 'Grudge', 'Creeper', 'Thornling', 'Blight', 'Watcher'],
  },
  14: {
    adjectives: ['Two-Faced', 'Polished', 'Applauded', 'Painted', 'Watched'],
    nouns: ['Lord', 'Mirror', 'Actor', 'Mask', 'Crier', 'Effigy', 'Portrait', 'Spectator'],
  },
  15: {
    adjectives: ['Sunken', 'Hopeless', 'Bottomless', 'Gnawing', 'Grey'],
    nouns: ['Fiend', 'Descent', 'Maw', 'Weight', 'Sinker', 'Hollow', 'Abyssling', 'Mourner'],
  },
  16: {
    adjectives: ['Forked-Tongue', 'Murmuring', 'Chattering', 'Venomous', 'Listening'],
    nouns: ['Demon', 'Gossip', 'Courtier', 'Tongue', 'Rumour', 'Eavesdropper', 'Scandal', 'Herald'],
  },
  17: {
    adjectives: ['Buried', 'Unspoken', 'Locked', 'Shameful', 'Private'],
    nouns: ['Spy', 'Keeper', 'Ledger', 'Confessor', 'Vault', 'Shadow', 'Witness', 'Seal'],
  },
  18: {
    adjectives: ['Iron', 'Crowned', 'Hammered', 'Conquering', 'Smelted'],
    nouns: ['Tyrant', 'Smith', 'Legion', 'Anvil', 'Warlord', 'Forgeling', 'Despot', 'Colossus'],
  },
  19: {
    adjectives: ['Sinking', 'Mud-Caked', 'Stagnant', 'Clinging', 'Fetid'],
    nouns: ['Beast', 'Bogling', 'Leech', 'Quagmire', 'Sluggard', 'Mire', 'Croaker', 'Sinkhole'],
  },
  20: {
    adjectives: ['Shrieking', 'Trembling', 'Vertigo', 'Breathless', 'Circling'],
    nouns: ['Hawk', 'Gale', 'Ledge', 'Panic', 'Screamer', 'Updraft', 'Talon', 'Precipice'],
  },
  21: {
    adjectives: ['Bone-Dry', 'Parched', 'Cracked', 'Sun-Blind', 'Silent'],
    nouns: ['Djinn', 'Husk', 'Dune', 'Skeleton', 'Scourge', 'Saltling', 'Wanderer', 'Drought'],
  },
  22: {
    adjectives: ['Turning', 'Mirrored', 'Endless', 'Misleading', 'Folded'],
    nouns: ['Bender', 'Corridor', 'Minotaur', 'Signpost', 'Wall', 'Cartographer', 'Loop', 'Door'],
  },
  23: {
    adjectives: ['Unjust', 'Sentencing', 'Bribed', 'Robed', 'Silencing'],
    nouns: ['Vizier', 'Magistrate', 'Verdict', 'Bailiff', 'Scribe', 'Gavel', 'Accuser', 'Chain'],
  },
  24: {
    adjectives: ['Burning', 'Smouldering', 'Unforgiving', 'Ember', 'Rekindled'],
    nouns: ['Khan', 'Grudge', 'Brand', 'Pyre', 'Cinderling', 'Flameborn', 'Scorcher', 'Ash'],
  },
  25: {
    adjectives: ['Glass', 'Admiring', 'Flawless', 'Reflecting', 'Posing'],
    nouns: ['Demon', 'Likeness', 'Shard', 'Idol', 'Beauty', 'Silhouette', 'Gaze', 'Facet'],
  },
  26: {
    adjectives: ['Chained', 'Craving', 'Gilded', 'Relapsing', 'Needled'],
    nouns: ['Master', 'Shackle', 'Hunger', 'Pusher', 'Vault', 'Dealer', 'Fixling', 'Collar'],
  },
  27: {
    adjectives: ['Buzzing', 'Pinging', 'Swarming', 'Blinking', 'Infinite'],
    nouns: ['Queen', 'Drone', 'Notification', 'Hivelet', 'Swarmling', 'Feed', 'Chime', 'Cluster'],
  },
  28: {
    adjectives: ['Masked', 'Applauded', 'Spotlit', 'Hollow', 'Adored'],
    nouns: ['Idol', 'Performer', 'Crowd', 'Encore', 'Critic', 'Marquee', 'Fanling', 'Curtain'],
  },
  29: {
    adjectives: ['Oath-Breaking', 'Two-Tongued', 'Smiling', 'Knifed', 'Sworn'],
    nouns: ['Breaker', 'Judas', 'Handshake', 'Confidant', 'Traitor', 'Pactling', 'Viper', 'Guest'],
  },
  30: {
    adjectives: ['Deep', 'Echoing', 'Bottomless', 'Cold-Watered', 'Answering'],
    nouns: ['Well', 'Whisperer', 'Bucket', 'Reflection', 'Depth', 'Caller', 'Rope', 'Listener'],
  },
  31: {
    adjectives: ['Tomorrow', 'Half-Meant', 'Abandoned', 'Reasoning', 'Unkept'],
    nouns: ['Titan', 'Excuse', 'Intention', 'Bonepile', 'Promise', 'Deserter', 'Delayer', 'Vow'],
  },
  32: {
    adjectives: ['Ashen', 'Unfeeling', 'Entombed', 'Stone-Hearted', 'Silent'],
    nouns: ['King', 'Crypt', 'Corpse', 'Warden', 'Sarcophagus', 'Mourner', 'Ossuary', 'Effigy'],
  },
  33: {
    adjectives: ['Hour-Eating', 'Squandering', 'Hollow', 'Drifting', 'Spent'],
    nouns: ['Eater', 'Clock', 'Wasteling', 'Lounger', 'Sandglass', 'Idler', 'Vagrant', 'Void'],
  },
  34: {
    adjectives: ['Severing', 'Estranged', 'Distant', 'Cutting', 'Unanswered'],
    nouns: ['Severer', 'Chasm', 'Silence', 'Exile', 'Rift', 'Stranger', 'Letter', 'Gulf'],
  },
  35: {
    adjectives: ['Carved', 'Worshipped', 'False', 'Gilded', 'Kneeling'],
    nouns: ['Colossus', 'Idol', 'Priest', 'Altar', 'Statue', 'Devotee', 'Pillar', 'Relic'],
  },
  36: {
    adjectives: ['Soft', 'Cushioned', 'Warm', 'Coddling', 'Padded'],
    nouns: ['Jailer', 'Pillow', 'Cage', 'Comfort', 'Lullaby', 'Nestling', 'Hearth', 'Keeper'],
  },
  37: {
    adjectives: ['Howling', 'Scattering', 'Frantic', 'Lashing', 'Directionless'],
    nouns: ['Djinn', 'Squall', 'Panic', 'Tempest', 'Gale', 'Whirlling', 'Thunderling', 'Chaos'],
  },
  38: {
    adjectives: ['Frozen', 'Indifferent', 'Numbing', 'Glacial', 'Unmoved'],
    nouns: ['Sheikh', 'Frostling', 'Rime', 'Apathy', 'Glacier', 'Icicle', 'Cold', 'Stillness'],
  },
  39: {
    adjectives: ['Spinning', 'Silken', 'Tangled', 'Patient', 'Threaded'],
    nouns: ['Weaver', 'Strand', 'Spider', 'Snare', 'Falsehood', 'Cocoon', 'Silkling', 'Trap'],
  },
  40: {
    adjectives: ['Fallen', 'Unrepentant', 'Throneless', 'Proud', 'Descending'],
    nouns: ['Prince', 'Crown', 'Descent', 'Noble', 'Pretender', 'Heir', 'Ruin', 'Sovereign'],
  },
  41: {
    adjectives: ['Iron-Skulled', 'Unbending', 'Deaf', 'Rooted', 'Certain'],
    nouns: ['Skull', 'Mule', 'Bulwark', 'Refuser', 'Rampart', 'Stoneling', 'Denier', 'Anchor'],
  },
  42: {
    adjectives: ['Swelling', 'Questioning', 'Salt-Bitter', 'Drowning', 'Unanswered'],
    nouns: ['Wraith', 'Wave', 'Undertow', 'Abyss', 'Squall', 'Depthling', 'Breaker', 'Question'],
  },
  43: {
    adjectives: ['Multiplied', 'Illusory', 'Smiling', 'Reversed', 'Identical'],
    nouns: ['Master', 'Reflection', 'Double', 'Pane', 'Trickster', 'Facet', 'Selfling', 'Image'],
  },
  44: {
    adjectives: ['Hammering', 'White-Hot', 'Tempered', 'Ringing', 'Quenched'],
    nouns: ['Smith', 'Anvil', 'Grudge', 'Blade', 'Bellows', 'Sparkling', 'Furnace', 'Hammer'],
  },
  45: {
    adjectives: ['Collecting', 'Chattering', 'Recording', 'Sharp-Tongued', 'Perched'],
    nouns: ['Collector', 'Magpie', 'Nestling', 'Slanderer', 'Archive', 'Beak', 'Gossipling', 'Roost'],
  },
  46: {
    adjectives: ['Echoing', 'Mocking', 'Repeating', 'Circling', 'Familiar'],
    nouns: ['Demon', 'Echo', 'Corridor', 'Voice', 'Repeater', 'Mockling', 'Refrain', 'Turn'],
  },
  47: {
    adjectives: ['Crowned', 'Fleeting', 'Jewelled', 'Departing', 'Beautiful'],
    nouns: ['Queen', 'Courtier', 'Treasure', 'Consort', 'Ornament', 'Handmaid', 'Throneling', 'Gift'],
  },
  48: {
    adjectives: ['Swelling', 'Praised', 'Towering', 'Insatiable', 'Immense'],
    nouns: ['Behemoth', 'Colossus', 'Titan', 'Flatterer', 'Monument', 'Growthling', 'Giant', 'Pillar'],
  },
  49: {
    adjectives: ['Interred', 'Lifeless', 'Shrouded', 'Sealed', 'Forgotten'],
    nouns: ['Warden', 'Gravling', 'Shroud', 'Sexton', 'Tomb', 'Mourner', 'Reliquary', 'Bone'],
  },
  50: {
    adjectives: ['Testing', 'Branching', 'Tangled', 'Tempting', 'Unmarked'],
    nouns: ['Beast', 'Trial', 'Thicket', 'Bough', 'Pathling', 'Snare', 'Grove', 'Warden'],
  },
  51: {
    adjectives: ['Inner', 'Raging', 'Self-Made', 'Turning', 'Unending'],
    nouns: ['Tempest', 'Self', 'Squall', 'Rival', 'Stormling', 'Gale', 'Shadow', 'Twin'],
  },
  52: {
    adjectives: ['Unwatched', 'Silent', 'Performing', 'Hidden', 'Alone'],
    nouns: ['Showman', 'Witness', 'Stage', 'Solitude', 'Actorling', 'Darkness', 'Applause', 'Echo'],
  },
  53: {
    adjectives: ['Self-Crowned', 'Cheering', 'Undefeated', 'Judging', 'Magnified'],
    nouns: ['Champion', 'Crowd', 'Judge', 'Contender', 'Egoling', 'Laurel', 'Arena', 'Rival'],
  },
  54: {
    adjectives: ['Weeping', 'Unshed', 'Still-Watered', 'Sorrowing', 'Deep'],
    nouns: ['Djinn', 'Tear', 'Mourner', 'Ripple', 'Lakeling', 'Lament', 'Reflection', 'Depth'],
  },
  55: {
    adjectives: ['Whisper-Forged', 'Molten', 'Doubt-Tempered', 'Smoking', 'Ringing'],
    nouns: ['Smith', 'Bellows', 'Doubt', 'Crucible', 'Forgeling', 'Ingot', 'Hammer', 'Ember'],
  },
  56: {
    adjectives: ['Crossing', 'Backward-Looking', 'Narrow', 'Final', 'Toll-Taking'],
    nouns: ['Keeper', 'Span', 'Tollman', 'Plank', 'Bridgeling', 'Chasm', 'Rail', 'Crosser'],
  },
  57: {
    adjectives: ['Vanguard', 'Disciplined', 'Banner-Bearing', 'Armoured', 'Marching'],
    nouns: ['General', 'Legionnaire', 'Standard', 'Captain', 'Spearman', 'Outrider', 'Sergeant', 'Column'],
  },
  58: {
    adjectives: ['Smoke-Walled', 'Illusory', 'Promising', 'Shifting', 'Fragrant'],
    nouns: ['Lord', 'Vapour', 'Gate', 'Mirage', 'Smokeling', 'Wall', 'Promise', 'Wisp'],
  },
  59: {
    adjectives: ['Grand', 'Roaring', 'Enthroned', 'Amplified', 'Commanding'],
    nouns: ['Whisperer', 'Herald', 'Throneling', 'Crier', 'Chancellor', 'Voice', 'Chorus', 'Roar'],
  },
  60: {
    adjectives: ['Fallen', 'Remembering', 'Robed', 'Ancient', 'Regretless'],
    nouns: ['Vizier', 'Courtier', 'Jinn', 'Chancellor', 'Exile', 'Peer', 'Counsellor', 'Noble'],
  },
  61: {
    adjectives: ['Flame-Wreathed', 'Searing', 'Unquenched', 'Blistering', 'Roaring'],
    nouns: ['Khan', 'Pyreling', 'Inferno', 'Brander', 'Firelord', 'Cinder', 'Blaze', 'Scorcher'],
  },
  62: {
    adjectives: ['Shadowed', 'Counselling', 'Six-Voiced', 'Veiled', 'Conspiring'],
    nouns: ['Councillor', 'Shade', 'Advisor', 'Conspirator', 'Silhouette', 'Assembly', 'Voice', 'Seat'],
  },
  63: {
    adjectives: ['Gate-Bound', 'Final', 'Unpassable', 'Watching', 'Sealed'],
    nouns: ['Warden', 'Gatekeeper', 'Portcullis', 'Sentinel', 'Threshold', 'Lock', 'Doorling', 'Guard'],
  },
  64: {
    adjectives: ['Last', 'Ancestral', 'Bannered', 'Unretreating', 'Bloodied'],
    nouns: ['General', 'Veteran', 'Standard', 'Vanguard', 'Warlord', 'Shieldman', 'Lancer', 'Line'],
  },
  65: {
    adjectives: ['Chosen', 'Throne-Sworn', 'Peerless', 'Final', 'Crowned'],
    nouns: ['Champion', 'Guardian', 'Executioner', 'Paragon', 'Sworn', 'Bladebearer', 'Sentinel', 'Heir'],
  },
  66: {
    adjectives: ['Throne-Born', 'Ancient', 'Nameless', 'First', 'Eternal'],
    nouns: ['Herald', 'Attendant', 'Shadow', 'Witness', 'Throneling', 'Servant', 'Watcher', 'Voice'],
  },
};
