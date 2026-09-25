// Minimal IndexedDB key-value stores for the API backend's offline outbox.
// localStorage caps out around 5 MB and blocks the main thread; scan photos and
// queued writes belong in IndexedDB.
const DB = 'fasalrakshak';
const STORES = ['cases', 'outbox'];
let dbp = null;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => STORES.forEach(s => { if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const result = fn(t.objectStore(store));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  }));
}

export const idb = {
  get: (store, key) => tx(store, 'readonly', s => s.get(key)),
  put: (store, key, value) => tx(store, 'readwrite', s => { s.put(value, key); }),
  del: (store, key) => tx(store, 'readwrite', s => { s.delete(key); }),
  all: store => tx(store, 'readonly', s => s.getAll()),
  keys: store => tx(store, 'readonly', s => s.getAllKeys())
};
