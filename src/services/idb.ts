/**
 * Minimal IndexedDB key-value store.
 * Used for data that must survive app restarts but must NOT live in localStorage
 * (localStorage is capped at ~5 MB and receipt images easily exceed that):
 *   - the persistent sync outbox (queued writes waiting for Google Sheets)
 *   - the cache of receipt images downloaded from Google Drive
 * Falls back to an in-memory Map when IndexedDB is unavailable.
 */
const DB_NAME = 'school_finance_sync';
const STORE = 'kv';
const memoryFallback = new Map<string, any>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function idbGet<T = any>(key: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return memoryFallback.get(key) as T | undefined;
  return new Promise((resolve) => {
    try {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result as T | undefined);
      r.onerror = () => resolve(memoryFallback.get(key) as T | undefined);
    } catch {
      resolve(memoryFallback.get(key) as T | undefined);
    }
  });
}

export async function idbSet(key: string, value: any): Promise<boolean> {
  memoryFallback.set(key, value);
  const db = await openDb();
  if (!db) return true;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbDelete(key: string): Promise<void> {
  memoryFallback.delete(key);
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
