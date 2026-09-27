/**
 * Sound.
 *
 * Everything here is SYNTHESISED with the Web Audio API at runtime - there
 * are no audio files to download, nothing to 404, and the whole system adds
 * zero bytes to the bundle. Each sound is built from oscillators, filtered
 * noise and envelopes, tuned to the game's palette:
 *
 *   - daf drum   : body-resonant membrane hit for combat
 *   - ney flute  : breathy sine with vibrato for ambience
 *   - sword      : inharmonic metal partials + noise transient
 *   - iblis      : detuned sub-bass with a reversed whisper of noise
 *
 * If a real recorded pack is added later, `SAMPLE_OVERRIDES` lets any
 * individual sound be replaced by a file without touching call sites.
 */

export type SoundId =
  | 'menu_ambient'
  | 'battle_drum'
  | 'sword_hit'
  | 'sword_crit'
  | 'habit_complete'
  | 'monster_death'
  | 'level_up'
  | 'rank_up'
  | 'iblis_whisper'
  | 'coin'
  | 'purchase'
  | 'error'
  | 'zone_clear'
  | 'ui_tap';

/** Optional real-audio replacements, keyed by id. Empty by default. */
const SAMPLE_OVERRIDES: Partial<Record<SoundId, string>> = {};

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;

let soundEnabled = true;
let musicEnabled = false;
let ambientStop: (() => void) | null = null;

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Browsers refuse to start audio before a user gesture, so the context is
 * created lazily on the first sound and resumed if it was suspended.
 */
function getCtx(): AudioContext | null {
  if (!soundEnabled) return null;

  if (!ctx) {
    const Ctor = audioContextCtor();
    if (!Ctor) return null;

    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.25;
      musicGain.connect(master);
    } catch {
      return null;
    }
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }

  return ctx;
}

/** Call once from a click handler to unlock audio on iOS and Chrome. */
export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
}

export function setSoundEnabled(value: boolean): void {
  soundEnabled = value;
  if (!value) {
    stopAmbient();
    if (master) master.gain.value = 0;
  } else if (master) {
    master.gain.value = 0.9;
  }
}

export function setMusicEnabled(value: boolean): void {
  musicEnabled = value;
  if (!value) stopAmbient();
}

/* ------------------------------------------------------------------ */
/* Synthesis primitives                                                */
/* ------------------------------------------------------------------ */

/** Short burst of filtered noise - transients, breath, ash, impacts. */
function noiseBurst(
  c: AudioContext,
  destination: AudioNode,
  opts: {
    duration: number;
    attack?: number;
    gain?: number;
    filter?: BiquadFilterType;
    frequency?: number;
    q?: number;
    sweepTo?: number;
    at?: number;
  },
): void {
  const at = opts.at ?? c.currentTime;
  const duration = Math.max(0.01, opts.duration);

  const frames = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = opts.filter ?? 'bandpass';
  filter.frequency.setValueAtTime(opts.frequency ?? 1200, at);
  filter.Q.value = opts.q ?? 1;
  if (opts.sweepTo) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.sweepTo), at + duration);
  }

  const gain = c.createGain();
  const peak = opts.gain ?? 0.3;
  const attack = opts.attack ?? 0.002;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  source.start(at);
  source.stop(at + duration + 0.02);
}

/** A single enveloped oscillator, optionally pitch-swept. */
function tone(
  c: AudioContext,
  destination: AudioNode,
  opts: {
    frequency: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    sweepTo?: number;
    detune?: number;
    at?: number;
  },
): void {
  const at = opts.at ?? c.currentTime;
  const duration = Math.max(0.02, opts.duration);

  const osc = c.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.frequency, at);
  if (opts.detune) osc.detune.value = opts.detune;
  if (opts.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.sweepTo), at + duration);
  }

  const gain = c.createGain();
  const peak = opts.gain ?? 0.2;
  const attack = opts.attack ?? 0.005;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/**
 * Inharmonic partials - what makes metal sound like metal rather than a
 * musical note. The ratios are deliberately non-integer.
 */
const METAL_RATIOS = [1, 1.67, 2.39, 3.14, 4.21, 5.53];

function metalHit(
  c: AudioContext,
  destination: AudioNode,
  opts: { root: number; duration: number; gain: number; at?: number },
): void {
  const at = opts.at ?? c.currentTime;

  METAL_RATIOS.forEach((ratio, i) => {
    tone(c, destination, {
      frequency: opts.root * ratio,
      duration: opts.duration * (1 - i * 0.12),
      type: 'square',
      gain: (opts.gain / (i + 1.6)) * 0.5,
      attack: 0.001,
      at,
    });
  });

  // The strike transient.
  noiseBurst(c, destination, {
    duration: 0.06,
    gain: opts.gain * 0.5,
    filter: 'highpass',
    frequency: 2600,
    at,
  });
}

/** Daf-style frame drum: pitched membrane plus a skin slap. */
function dafHit(
  c: AudioContext,
  destination: AudioNode,
  opts: { gain?: number; pitch?: number; at?: number } = {},
): void {
  const at = opts.at ?? c.currentTime;
  const gain = opts.gain ?? 0.5;
  const pitch = opts.pitch ?? 92;

  tone(c, destination, {
    frequency: pitch,
    sweepTo: pitch * 0.45,
    duration: 0.36,
    type: 'sine',
    gain,
    attack: 0.002,
    at,
  });

  noiseBurst(c, destination, {
    duration: 0.13,
    gain: gain * 0.35,
    filter: 'bandpass',
    frequency: 1900,
    sweepTo: 500,
    q: 0.8,
    at,
  });
}

/* ------------------------------------------------------------------ */
/* The sounds                                                          */
/* ------------------------------------------------------------------ */

function playSynth(id: SoundId, c: AudioContext, out: AudioNode, volume: number): void {
  const now = c.currentTime;
  const g = volume;

  switch (id) {
    /* A sword landing on something that resents it. */
    case 'sword_hit':
      metalHit(c, out, { root: 340, duration: 0.3, gain: 0.26 * g });
      dafHit(c, out, { gain: 0.16 * g, pitch: 70 });
      break;

    /* Critical: lower, longer, with a rising tail underneath. */
    case 'sword_crit':
      metalHit(c, out, { root: 250, duration: 0.55, gain: 0.34 * g });
      dafHit(c, out, { gain: 0.3 * g, pitch: 58 });
      tone(c, out, {
        frequency: 180,
        sweepTo: 520,
        duration: 0.5,
        type: 'sawtooth',
        gain: 0.1 * g,
        at: now + 0.02,
      });
      break;

    case 'battle_drum':
      dafHit(c, out, { gain: 0.45 * g });
      break;

    /* Soft chime, a rising perfect fifth. */
    case 'habit_complete':
      tone(c, out, { frequency: 880, duration: 0.3, type: 'sine', gain: 0.16 * g });
      tone(c, out, {
        frequency: 1320,
        duration: 0.42,
        type: 'sine',
        gain: 0.11 * g,
        at: now + 0.07,
      });
      break;

    /* Dissolving into ash: a downward noise sweep. */
    case 'monster_death':
      noiseBurst(c, out, {
        duration: 0.85,
        gain: 0.3 * g,
        filter: 'lowpass',
        frequency: 3200,
        sweepTo: 140,
        attack: 0.03,
      });
      tone(c, out, {
        frequency: 240,
        sweepTo: 60,
        duration: 0.7,
        type: 'triangle',
        gain: 0.14 * g,
      });
      break;

    /* A column of light: ascending arpeggio. */
    case 'level_up':
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone(c, out, {
          frequency: freq,
          duration: 0.5,
          type: 'triangle',
          gain: 0.15 * g,
          at: now + i * 0.09,
        });
      });
      break;

    /* Heavier, ceremonial: fifths with a drum under them. */
    case 'rank_up':
      [392, 523.25, 587.33, 784].forEach((freq, i) => {
        tone(c, out, {
          frequency: freq,
          duration: 0.9,
          type: 'sine',
          gain: 0.15 * g,
          at: now + i * 0.13,
        });
      });
      dafHit(c, out, { gain: 0.4 * g, at: now });
      dafHit(c, out, { gain: 0.3 * g, at: now + 0.39 });
      break;

    case 'zone_clear':
      [261.63, 329.63, 392, 523.25, 659.25].forEach((freq, i) => {
        tone(c, out, {
          frequency: freq,
          duration: 0.8,
          type: 'triangle',
          gain: 0.13 * g,
          at: now + i * 0.1,
        });
      });
      break;

    /* Iblis: detuned sub-bass and a breath that never resolves. */
    case 'iblis_whisper': {
      tone(c, out, { frequency: 48, duration: 2.6, type: 'sine', gain: 0.24 * g });
      tone(c, out, {
        frequency: 48,
        duration: 2.6,
        type: 'sine',
        gain: 0.18 * g,
        detune: 22,
      });
      // Breath, swelling then falling away.
      noiseBurst(c, out, {
        duration: 1.9,
        gain: 0.1 * g,
        filter: 'bandpass',
        frequency: 700,
        sweepTo: 220,
        q: 3,
        attack: 0.6,
        at: now + 0.25,
      });
      tone(c, out, {
        frequency: 196,
        sweepTo: 146,
        duration: 2.2,
        type: 'sawtooth',
        gain: 0.05 * g,
        at: now + 0.15,
      });
      break;
    }

    case 'coin':
      tone(c, out, { frequency: 1760, duration: 0.11, type: 'square', gain: 0.07 * g });
      tone(c, out, {
        frequency: 2637,
        duration: 0.14,
        type: 'square',
        gain: 0.05 * g,
        at: now + 0.045,
      });
      break;

    case 'purchase':
      tone(c, out, { frequency: 660, duration: 0.16, type: 'triangle', gain: 0.14 * g });
      tone(c, out, {
        frequency: 990,
        duration: 0.26,
        type: 'triangle',
        gain: 0.12 * g,
        at: now + 0.09,
      });
      metalHit(c, out, { root: 900, duration: 0.14, gain: 0.07 * g, at: now + 0.02 });
      break;

    /* Refusal: a falling minor second. */
    case 'error':
      tone(c, out, { frequency: 200, duration: 0.16, type: 'square', gain: 0.1 * g });
      tone(c, out, {
        frequency: 150,
        duration: 0.22,
        type: 'square',
        gain: 0.1 * g,
        at: now + 0.09,
      });
      break;

    case 'ui_tap':
      tone(c, out, { frequency: 1200, duration: 0.05, type: 'sine', gain: 0.05 * g });
      break;

    case 'menu_ambient':
      // Handled by startAmbient; a one-shot here would be meaningless.
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Sample override path                                                */
/* ------------------------------------------------------------------ */

const sampleCache = new Map<SoundId, HTMLAudioElement>();

function playSample(id: SoundId, src: string, volume: number): boolean {
  if (typeof Audio === 'undefined') return false;

  try {
    let audio = sampleCache.get(id);
    if (!audio) {
      audio = new Audio(src);
      audio.preload = 'auto';
      sampleCache.set(id, audio);
    }
    audio.currentTime = 0;
    audio.volume = Math.min(1, Math.max(0, volume));
    void audio.play().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Fire and forget. Never throws, never blocks, never interrupts a battle. */
export function play(id: SoundId, volume = 0.6): void {
  if (!soundEnabled) return;

  const override = SAMPLE_OVERRIDES[id];
  if (override && playSample(id, override, volume)) return;

  const c = getCtx();
  if (!c || !master) return;

  try {
    playSynth(id, c, master, volume);
  } catch {
    /* Audio must never be the reason something fails. */
  }
}

/**
 * Ney-flute ambience: a slow, breathy drone that drifts between two notes.
 * Deliberately sparse - this plays under menus, not under thinking.
 */
export function startAmbient(_id: SoundId = 'menu_ambient', volume = 0.22): void {
  if (!soundEnabled || !musicEnabled) return;

  stopAmbient();

  const c = getCtx();
  if (!c || !musicGain) return;

  try {
    musicGain.gain.value = volume;

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 220; // A3

    // Breath: a gentle vibrato.
    const vibrato = c.createOscillator();
    vibrato.frequency.value = 4.6;
    const vibratoDepth = c.createGain();
    vibratoDepth.gain.value = 2.4;
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(osc.frequency);

    // The airy part of a flute tone.
    const breath = c.createBufferSource();
    const frames = c.sampleRate * 2;
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * 0.5;
    breath.buffer = buffer;
    breath.loop = true;

    const breathFilter = c.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = 900;
    breathFilter.Q.value = 2;

    const breathGain = c.createGain();
    breathGain.gain.value = 0.035;

    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.0001, c.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 3);

    osc.connect(envelope);
    breath.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(envelope);
    envelope.connect(musicGain);

    osc.start();
    vibrato.start();
    breath.start();

    // Drift slowly between two pitches so it never sits still.
    const drift = window.setInterval(() => {
      if (!ctx) return;
      const target = Math.random() > 0.5 ? 220 : 293.66; // A3 / D4
      osc.frequency.exponentialRampToValueAtTime(target, ctx.currentTime + 6);
    }, 9000);

    ambientStop = () => {
      window.clearInterval(drift);
      try {
        envelope.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.2);
        osc.stop(c.currentTime + 1.4);
        vibrato.stop(c.currentTime + 1.4);
        breath.stop(c.currentTime + 1.4);
      } catch {
        /* already stopped */
      }
    };
  } catch {
    /* ignore */
  }
}

export function stopAmbient(): void {
  if (!ambientStop) return;
  try {
    ambientStop();
  } catch {
    /* ignore */
  }
  ambientStop = null;
}

/** Haptics, where the platform offers them. */
export function vibrate(pattern: number | number[] = 12): void {
  if (!soundEnabled) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

/** A short flourish for a boss kill: drum roll into a metal ring. */
export function playBossDefeat(volume = 0.7): void {
  if (!soundEnabled) return;
  const c = getCtx();
  if (!c || !master) return;

  try {
    for (let i = 0; i < 6; i += 1) {
      dafHit(c, master, { gain: (0.18 + i * 0.05) * volume, at: c.currentTime + i * 0.085 });
    }
    metalHit(c, master, { root: 220, duration: 1.4, gain: 0.3 * volume, at: c.currentTime + 0.55 });
    [392, 523.25, 784].forEach((freq, i) => {
      tone(c, master!, {
        frequency: freq,
        duration: 1.3,
        type: 'sine',
        gain: 0.13 * volume,
        at: c.currentTime + 0.6 + i * 0.1,
      });
    });
  } catch {
    /* ignore */
  }
}
