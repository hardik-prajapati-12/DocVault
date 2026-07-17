/**
 * OPFS (Origin Private File System) Storage Service
 * Provides high-performance file storage using the browser's OPFS API.
 * Falls back to IndexedDB blob storage when OPFS is unavailable.
 */

import { db } from '@/db/db';

const OPFS_ROOT_DIR = 'docvault-files';

let opfsSupported: boolean | null = null;

async function isOPFSSupported(): Promise<boolean> {
  if (opfsSupported !== null) return opfsSupported;
  try {
    const root = await navigator.storage.getDirectory();
    await root.getDirectoryHandle(OPFS_ROOT_DIR, { create: true });
    opfsSupported = true;
  } catch {
    opfsSupported = false;
  }
  return opfsSupported;
}

async function getDocVaultDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_ROOT_DIR, { create: true });
}

// ── OPFS Operations ──

async function saveToOPFS(id: string, blob: Blob): Promise<void> {
  const dir = await getDocVaultDir();
  const fileHandle = await dir.getFileHandle(id, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function readFromOPFS(id: string): Promise<Blob | null> {
  try {
    const dir = await getDocVaultDir();
    const fileHandle = await dir.getFileHandle(id);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
}

async function deleteFromOPFS(id: string): Promise<void> {
  try {
    const dir = await getDocVaultDir();
    await dir.removeEntry(id);
  } catch {
    // File may not exist
  }
}

// ── IndexedDB Fallback ──

const FALLBACK_STORE = 'docvault-blobs';

function getFallbackDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FALLBACK_STORE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('blobs');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToFallback(id: string, blob: Blob): Promise<void> {
  const idb = await getFallbackDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readFromFallback(id: string): Promise<Blob | null> {
  const idb = await getFallbackDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromFallback(id: string): Promise<void> {
  const idb = await getFallbackDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Public API ──

export async function saveFile(id: string, blob: Blob): Promise<void> {
  if (await isOPFSSupported()) {
    await saveToOPFS(id, blob);
  } else {
    await saveToFallback(id, blob);
  }
}

export async function readFile(id: string): Promise<Blob | null> {
  if (await isOPFSSupported()) {
    return readFromOPFS(id);
  }
  return readFromFallback(id);
}

export async function deleteFile(id: string): Promise<void> {
  if (await isOPFSSupported()) {
    await deleteFromOPFS(id);
  } else {
    await deleteFromFallback(id);
  }
}

export async function getStorageEstimate(): Promise<{ used: number; total: number }> {
  try {
    const estimate = await navigator.storage.estimate();
    const docs = await db.documents.toArray();
    const logicalUsed = docs.reduce((sum, doc) => sum + doc.size, 0);
    return {
      used: logicalUsed,
      total: estimate.quota ?? 10 * 1024 * 1024 * 1024,
    };
  } catch {
    return { used: 0, total: 10 * 1024 * 1024 * 1024 };
  }
}

export async function clearAllFiles(): Promise<void> {
  if (await isOPFSSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(OPFS_ROOT_DIR, { recursive: true });
    } catch {
      // Directory may not exist
    }
  } else {
    const idb = await getFallbackDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/**
 * Export all files as a map of id -> blob for backup purposes.
 */
export async function exportAllFiles(): Promise<Map<string, Blob>> {
  const files = new Map<string, Blob>();
  const docs = await db.documents.toArray();
  for (const doc of docs) {
    const blob = await readFile(doc.id);
    if (blob) {
      files.set(doc.id, blob);
    }
  }
  return files;
}
