const DB_NAME = 'spotlocal_audio_v1';
const STORE_NAME = 'audio_files';

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioBlob(key: string, file: Blob): Promise<void> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioBlobUrl(key: string): Promise<string | null> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => {
      const blob = req.result as Blob | undefined;
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(URL.createObjectURL(blob));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function readAudioDurationFromFile(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 180;
      URL.revokeObjectURL(url);
      resolve(dur > 0 ? dur : 180);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(180);
    };
    audio.src = url;
  });
}
