// Carries a finished try-on image from the try-on screen to the booking form, including across
// a log-in. One slot in IndexedDB on this device; nothing is uploaded until the booking is sent.
const DB = "ink-masters";
const STORE = "tryon";
const KEY = "pending";
const MAX_AGE_MS = 60 * 60 * 1000;

type Saved = { blob: Blob; workId: string; savedAt: number };

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveTryOn(blob: Blob, workId: string) {
  await run("readwrite", (s) => s.put({ blob, workId, savedAt: Date.now() } satisfies Saved, KEY));
}

/**
 * The saved image for this design, or null if there isn't one, it's for another design, or it's
 * over an hour old. Whatever was there is removed from the device either way.
 */
export async function loadTryOn(workId: string) {
  try {
    const saved = (await run("readonly", (s) => s.get(KEY))) as Saved | undefined;
    if (saved) await clearTryOn();
    if (!saved || saved.workId !== workId || Date.now() - saved.savedAt > MAX_AGE_MS) return null;
    return saved.blob;
  } catch {
    return null;
  }
}

export async function clearTryOn() {
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    /* nothing to clear */
  }
}
