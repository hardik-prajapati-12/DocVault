/**
 * File Service — Orchestrates CRUD operations between Dexie (metadata) and OPFS (binary data).
 */

import { db } from '@/db/db';
import { saveFile, readFile, deleteFile as deleteFromStorage } from '@/services/storage/opfs-storage';
import { generateId, sanitizeFileName, getExtension, getMimeType, getBaseName } from '@/utils';
import type { DocFile, UploadProgress } from '@/types';

import { useAppStore } from '@/store/app-store';

function triggerAutoSync() {
  const { syncProvider, autoSync } = useAppStore.getState();
  if (syncProvider !== 'none' && autoSync) {
    import('@/services/sync/sync-service').then(({ SyncService }) => {
      new SyncService().sync().catch(console.error);
    });
  }
}

type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Upload multiple files with progress tracking.
 */
export async function uploadFiles(
  files: File[],
  folderId: string | null = null,
  onProgress?: ProgressCallback
): Promise<DocFile[]> {
  const results: DocFile[] = [];

  for (const file of files) {
    const id = generateId();
    const sanitizedName = sanitizeFileName(file.name);
    const extension = getExtension(sanitizedName);
    const mimeType = file.type || getMimeType(extension);

    const progress: UploadProgress = {
      fileId: id,
      fileName: sanitizedName,
      fileSize: file.size,
      loaded: 0,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
      status: 'uploading',
    };

    onProgress?.(progress);

    const startTime = performance.now();

    try {
      // Store binary data in OPFS
      await saveFile(id, file);

      const elapsed = (performance.now() - startTime) / 1000;
      progress.loaded = file.size;
      progress.percentage = 100;
      progress.speed = elapsed > 0 ? file.size / elapsed : file.size;
      progress.remainingTime = 0;
      progress.status = 'complete';

      // Generate thumbnail for images
      let thumbnailDataUrl: string | null = null;
      if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
        try {
          thumbnailDataUrl = await generateThumbnail(file, 200);
        } catch {
          // Thumbnail generation failure is non-critical
        }
      }

      // Store metadata in Dexie
      const doc: DocFile = {
        id,
        name: sanitizedName,
        extension,
        mimeType,
        size: file.size,
        tags: [],
        folderId,
        isFavorite: 0,
        isArchived: 0,
        isDeleted: 0,
        createdAt: new Date(file.lastModified),
        modifiedAt: new Date(file.lastModified),
        uploadedAt: new Date(),
        deletedAt: null,
        compressedSize: null,
        opfsPath: id,
        thumbnailDataUrl,
      };

      await db.documents.add(doc);
      results.push(doc);
      onProgress?.(progress);
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Upload failed';
      onProgress?.(progress);
    }
  }

  // Trigger background sync if auto-sync is enabled
  const { syncProvider, autoSync } = useAppStore.getState();
  if (syncProvider !== 'none' && autoSync) {
    import('@/services/sync/sync-service').then(({ SyncService }) => {
      new SyncService().sync().catch(console.error);
    });
  }

  return results;
}

/**
 * Generate a thumbnail for an image file.
 */
async function generateThumbnail(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/webp', 0.7));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}


/**
 * Soft-delete a document (move to trash).
 */
export async function softDeleteDocument(id: string): Promise<void> {
  await db.documents.update(id, {
    isDeleted: 1,
    deletedAt: new Date(),
  });
  triggerAutoSync();
}

/**
 * Permanently delete a document and its file data.
 */
export async function permanentDeleteDocument(id: string): Promise<void> {
  await deleteFromStorage(id);
  await db.documents.delete(id);
  triggerAutoSync();
}

/**
 * Restore a soft-deleted document.
 */
export async function restoreDocument(id: string): Promise<void> {
  await db.documents.update(id, {
    isDeleted: 0,
    deletedAt: null,
  });
  triggerAutoSync();
}

/**
 * Rename a document.
 */
export async function renameDocument(id: string, newName: string): Promise<void> {
  const sanitized = sanitizeFileName(newName);
  const extension = getExtension(sanitized);
  await db.documents.update(id, {
    name: sanitized,
    extension,
    modifiedAt: new Date(),
  });
  triggerAutoSync();
}

/**
 * Duplicate a document.
 */
export async function duplicateDocument(id: string): Promise<DocFile | null> {
  const original = await db.documents.get(id);
  if (!original) return null;

  const blob = await readFile(id);
  if (!blob) return null;

  const newId = generateId();
  const baseName = getBaseName(original.name);
  const newName = original.extension
    ? `${baseName} (copy).${original.extension}`
    : `${baseName} (copy)`;

  await saveFile(newId, blob);

  const duplicate: DocFile = {
    ...original,
    id: newId,
    name: newName,
    opfsPath: newId,
    isFavorite: 0,
    createdAt: new Date(),
    uploadedAt: new Date(),
    modifiedAt: new Date(),
  };

  await db.documents.add(duplicate);
  triggerAutoSync();
  return duplicate;
}

/**
 * Move a document to a different folder.
 */
export async function moveDocument(id: string, folderId: string | null): Promise<void> {
  await db.documents.update(id, {
    folderId,
    modifiedAt: new Date(),
  });
  triggerAutoSync();
}

/**
 * Toggle favorite status.
 */
export async function toggleFavorite(id: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  await db.documents.update(id, { isFavorite: doc.isFavorite ? 0 : 1 });
  triggerAutoSync();
}

/**
 * Archive a document.
 */
export async function archiveDocument(id: string): Promise<void> {
  await db.documents.update(id, { isArchived: 1, modifiedAt: new Date() });
  triggerAutoSync();
}

/**
 * Unarchive a document.
 */
export async function unarchiveDocument(id: string): Promise<void> {
  await db.documents.update(id, { isArchived: 0, modifiedAt: new Date() });
  triggerAutoSync();
}

/**
 * Update document tags.
 */
export async function updateTags(id: string, tags: string[]): Promise<void> {
  await db.documents.update(id, { tags, modifiedAt: new Date() });
  triggerAutoSync();
}

/**
 * Replace the file content (update/replace).
 */
export async function replaceFileContent(id: string, newFile: File): Promise<void> {
  const sanitizedName = sanitizeFileName(newFile.name);
  const extension = getExtension(sanitizedName);
  const mimeType = newFile.type || getMimeType(extension);

  await saveFile(id, newFile);
  await db.documents.update(id, {
    name: sanitizedName,
    extension,
    mimeType,
    size: newFile.size,
    modifiedAt: new Date(),
  });
  triggerAutoSync();
}

export async function getFileBlob(id: string): Promise<Blob | null> {
  const doc = await db.documents.get(id);
  const blob = await readFile(id);
  if (!blob || !doc) return blob;
  return new Blob([blob], { type: doc.mimeType });
}

/**
 * Bulk soft-delete multiple documents.
 */
export async function bulkSoftDelete(ids: string[]): Promise<void> {
  await db.documents.where('id').anyOf(ids).modify({
    isDeleted: 1,
    deletedAt: new Date(),
  });
  triggerAutoSync();
}

/**
 * Bulk permanent delete.
 */
export async function bulkPermanentDelete(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteFromStorage(id);
  }
  await db.documents.bulkDelete(ids);
  triggerAutoSync();
}

/**
 * Bulk restore.
 */
export async function bulkRestore(ids: string[]): Promise<void> {
  await db.documents.where('id').anyOf(ids).modify({
    isDeleted: 0,
    deletedAt: null,
  });
  triggerAutoSync();
}

/**
 * Create a folder.
 */
export async function createFolder(name: string, parentId: string | null = null): Promise<string> {
  const id = generateId();
  await db.folders.add({
    id,
    name: sanitizeFileName(name),
    parentId,
    createdAt: new Date(),
    modifiedAt: new Date(),
  });
  triggerAutoSync();
  return id;
}

/**
 * Rename a folder.
 */
export async function renameFolder(id: string, newName: string): Promise<void> {
  await db.folders.update(id, {
    name: sanitizeFileName(newName),
    modifiedAt: new Date(),
  });
  triggerAutoSync();
}

/**
 * Delete a folder and all its contents.
 */
export async function deleteFolder(id: string): Promise<void> {
  // Move all documents in this folder to root
  await db.documents.where('folderId').equals(id).modify({ folderId: null });
  // Delete sub-folders recursively
  const subFolders = await db.folders.where('parentId').equals(id).toArray();
  for (const sub of subFolders) {
    await deleteFolder(sub.id);
  }
  await db.folders.delete(id);
  triggerAutoSync();
}

/**
 * Empty the trash: permanently delete all soft-deleted documents.
 */
export async function emptyTrash(): Promise<void> {
  const trashedDocs = await db.documents.where('isDeleted').equals(1).toArray();
  for (const doc of trashedDocs) {
    await deleteFromStorage(doc.id);
  }
  await db.documents.where('isDeleted').equals(1).delete();
  triggerAutoSync();
}
