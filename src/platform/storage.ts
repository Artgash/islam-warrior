/**
 * The ONLY place in the app that touches `window` / `localStorage`.
 *
 * Swapping this file's implementation for AsyncStorage (or MMKV) is the whole
 * of the storage work needed to run the game on React Native — nothing above
 * this layer knows what platform it is on.
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  /** Synchronous read, used by Zustand's rehydration path. */
  getItemSync(key: string): string | null;
}

const memory = new Map<string, string>();

/** Fallback used in SSR, tests and private-mode browsers. */
const memoryAdapter: StorageAdapter = {
  async getItem(key) {
    return memory.get(key) ?? null;
  },
  async setItem(key, value) {
    memory.set(key, value);
  },
  async removeItem(key) {
    memory.delete(key);
  },
  async clear() {
    memory.clear();
  },
  getItemSync(key) {
    return memory.get(key) ?? null;
  },
};

function hasLocalStorage(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const probe = '__iw_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const webAdapter: StorageAdapter = {
  async getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  async removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
  async clear() {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(NAMESPACE))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      memory.clear();
    }
  },
  getItemSync(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
};

export const NAMESPACE = 'islam-warrior:';

export const storage: StorageAdapter = hasLocalStorage() ? webAdapter : memoryAdapter;

/* ------------------------------------------------------------------ */
/* Typed helpers                                                       */
/* ------------------------------------------------------------------ */

export function namespaced(key: string): string {
  return key.startsWith(NAMESPACE) ? key : `${NAMESPACE}${key}`;
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await storage.getItem(namespaced(key));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readJsonSync<T>(key: string, fallback: T): T {
  const raw = storage.getItemSync(namespaced(key));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await storage.setItem(namespaced(key), JSON.stringify(value));
  } catch {
    // Quota exceeded or serialisation failure: the app keeps running on
    // in-memory state rather than crashing mid-battle.
  }
}

export async function removeKey(key: string): Promise<void> {
  await storage.removeItem(namespaced(key));
}

/** Zustand `persist` storage shim built on the adapter above. */
export const zustandStorage = {
  getItem: (name: string) => storage.getItemSync(namespaced(name)),
  setItem: (name: string, value: string) => {
    void storage.setItem(namespaced(name), value);
  },
  removeItem: (name: string) => {
    void storage.removeItem(namespaced(name));
  },
};
