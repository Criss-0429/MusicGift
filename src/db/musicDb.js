const DB_NAME = 'MusicGiftDB_Anamaria';
const DB_VERSION = 1;

export function initDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getAllSongs() {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const store = tx.objectStore('songs');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function addSong(song) {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    const req = store.put(song);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSong(id) {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
