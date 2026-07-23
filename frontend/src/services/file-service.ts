/**
 * File Service — Orchestrates CRUD operations between React app state and the MERN Express backend.
 */

import { generateId, sanitizeFileName, getExtension, getMimeType } from '@/utils';
import type { DocFile, UploadProgress } from '@/types';
import { useAppStore } from '@/store/app-store';

type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Helper fetch wrapper that automatically includes the Authorization header.
 */
function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('docvault-auth-token');
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

/**
 * Ensures that a list of folder path parts exists in the database.
 * Reuses existing folders where possible to avoid duplicates.
 * Returns the folder ID of the leaf folder.
 */
export async function ensureFolderPath(
  parts: string[],
  startParentId: string | null = null
): Promise<string | null> {
  if (parts.length === 0) return startParentId;

  let currentParentId: string | null = startParentId;

  for (const part of parts) {
    const folders = useAppStore.getState().folders;
    // Look for a folder matching the name and parentId
    const existing = folders.find(
      (f) => f.name.toLowerCase() === part.toLowerCase() && f.parentId === currentParentId
    );

    if (existing) {
      currentParentId = existing.id;
    } else {
      // Create the folder
      currentParentId = await createFolder(part, currentParentId);
    }
  }

  return currentParentId;
}

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

    // Resolve folderId from webkitRelativePath or relativePath if present
    let fileFolderId = folderId;
    const relPath = file.webkitRelativePath || (file as any).relativePath;
    if (relPath) {
      const parts = relPath.split('/');
      if (parts.length > 1) {
        const folderParts = parts.slice(0, parts.length - 1);
        fileFolderId = await ensureFolderPath(folderParts, folderId);
      }
    }

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

    // Generate thumbnail for images
    let thumbnailDataUrl: string | null = null;
    if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        thumbnailDataUrl = await generateThumbnail(file, 200);
      } catch {
        // Thumbnail generation failure is non-critical
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', id);
    formData.append('name', sanitizedName);
    formData.append('extension', extension);
    formData.append('mimeType', mimeType);
    formData.append('folderId', fileFolderId || '');
    formData.append('createdAt', new Date(file.lastModified).toISOString());
    formData.append('modifiedAt', new Date(file.lastModified).toISOString());
    if (thumbnailDataUrl) {
      formData.append('thumbnailDataUrl', thumbnailDataUrl);
    }

    try {
      const doc = await new Promise<DocFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/documents/upload');

        // Attach JWT token for authenticated uploads
        const token = localStorage.getItem('docvault-auth-token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const elapsed = (performance.now() - startTime) / 1000;
            progress.loaded = e.loaded;
            progress.percentage = Math.round((e.loaded / e.total) * 100);
            progress.speed = elapsed > 0 ? e.loaded / elapsed : e.loaded;
            progress.remainingTime = progress.speed > 0 ? (e.total - e.loaded) / progress.speed : 0;
            onProgress?.({ ...progress });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Failed to parse response'));
            }
          } else {
            reject(new Error(xhr.responseText || 'Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      progress.status = 'complete';
      progress.percentage = 100;
      onProgress?.(progress);
      results.push(doc);
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Upload failed';
      onProgress?.(progress);
    }
  }

  // Trigger app reload
  await useAppStore.getState().fetchData();

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
  await authFetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isDeleted: 1,
      deletedAt: new Date(),
    }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Permanently delete a document and its file data.
 */
export async function permanentDeleteDocument(id: string): Promise<void> {
  await authFetch(`/api/documents/${id}/permanent`, {
    method: 'DELETE',
  });
  await useAppStore.getState().fetchData();
}

/**
 * Restore a soft-deleted document.
 */
export async function restoreDocument(id: string): Promise<void> {
  await authFetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isDeleted: 0,
      deletedAt: null,
    }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Rename a document.
 */
export async function renameDocument(id: string, newName: string): Promise<void> {
  const sanitized = sanitizeFileName(newName);
  const extension = getExtension(sanitized);
  await authFetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: sanitized,
      extension,
    }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Duplicate a document.
 */
export async function duplicateDocument(id: string): Promise<DocFile | null> {
  const original = useAppStore.getState().documents.find((d) => d.id === id);
  if (!original) return null;

  const newId = generateId();
  const baseName = original.name.includes('.') 
    ? original.name.slice(0, original.name.lastIndexOf('.'))
    : original.name;
  const newName = original.extension
    ? `${baseName} (copy).${original.extension}`
    : `${baseName} (copy)`;

  const res = await authFetch(`/api/documents/duplicate/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newId, newName }),
  });

  if (!res.ok) return null;
  const duplicate = await res.json();
  await useAppStore.getState().fetchData();
  return duplicate;
}

/**
 * Move a document to a different folder.
 */
export async function moveDocument(id: string, folderId: string | null): Promise<void> {
  await authFetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Toggle favorite status.
 */
export async function toggleFavorite(id: string): Promise<void> {
  const doc = useAppStore.getState().documents.find((d) => d.id === id);
  if (!doc) return;
  await authFetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isFavorite: doc.isFavorite ? 0 : 1 }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Archive a document.
 */
export async function archiveDocument(id: string): Promise<void> {
  await authFetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isArchived: 1 }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Unarchive a document.
 */
export async function unarchiveDocument(id: string): Promise<void> {
  await authFetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isArchived: 0 }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Update document tags.
 */
export async function updateTags(id: string, tags: string[]): Promise<void> {
  await authFetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Replace the file content (update/replace).
 */
export async function replaceFileContent(id: string, newFile: File): Promise<void> {
  const sanitizedName = sanitizeFileName(newFile.name);
  const extension = getExtension(sanitizedName);
  const mimeType = newFile.type || getMimeType(extension);

  // Generate thumbnail for images
  let thumbnailDataUrl: string | null = null;
  if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
    try {
      thumbnailDataUrl = await generateThumbnail(newFile, 200);
    } catch {
      // non-critical
    }
  }

  const formData = new FormData();
  formData.append('file', newFile);
  formData.append('id', id);
  formData.append('name', sanitizedName);
  formData.append('extension', extension);
  formData.append('mimeType', mimeType);
  formData.append('createdAt', new Date(newFile.lastModified).toISOString());
  formData.append('modifiedAt', new Date().toISOString());
  if (thumbnailDataUrl) {
    formData.append('thumbnailDataUrl', thumbnailDataUrl);
  }

  await authFetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  await useAppStore.getState().fetchData();
}

/**
 * Resolves the best available URL for a document file.
 */
export function getFileUrl(doc: DocFile): string {
  if (doc.cloudinaryUrl) return doc.cloudinaryUrl;
  if (doc.opfsPath) return `/uploads/${doc.opfsPath}`;
  return doc.localUrl || '';
}

/**
 * Get file binary as a Blob.
 */
export async function getFileBlob(id: string): Promise<Blob | null> {
  try {
    const res = await authFetch(`/api/documents/${id}/file`);
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        console.warn(`File endpoint returned JSON response for document ${id}`);
        return null;
      }
      return await res.blob();
    }
  } catch (error) {
    console.warn(`Failed to fetch file blob for document ${id}:`, error);
  }
  return null;
}


/**
 * Bulk soft-delete multiple documents.
 */
export async function bulkSoftDelete(ids: string[]): Promise<void> {
  await authFetch('/api/documents/bulk-soft-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Bulk permanent delete.
 */
export async function bulkPermanentDelete(ids: string[]): Promise<void> {
  await authFetch('/api/documents/bulk-permanent-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Bulk restore.
 */
export async function bulkRestore(ids: string[]): Promise<void> {
  await authFetch('/api/documents/bulk-restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Bulk archive multiple documents.
 */
export async function bulkArchive(ids: string[], isArchived: number = 1): Promise<void> {
  await authFetch('/api/documents/bulk-archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, isArchived }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Bulk favorite multiple documents.
 */
export async function bulkFavorite(ids: string[], isFavorite: number = 1): Promise<void> {
  await authFetch('/api/documents/bulk-favorite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, isFavorite }),
  });
  await useAppStore.getState().fetchData();
}

/**
 * Bulk move multiple documents to a folder.
 */
export async function bulkMoveDocuments(ids: string[], folderId: string | null): Promise<void> {
  await authFetch('/api/documents/bulk-move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, folderId }),
  });
  await useAppStore.getState().fetchData();
}


/**
 * Create a folder.
 */
export async function createFolder(name: string, parentId: string | null = null): Promise<string> {
  const id = generateId();
  const res = await authFetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      name: sanitizeFileName(name),
      parentId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create folder');
  }
  await useAppStore.getState().fetchData();
  return id;
}

/**
 * Rename a folder.
 */
export async function renameFolder(id: string, newName: string): Promise<void> {
  const res = await authFetch(`/api/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: sanitizeFileName(newName),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to rename folder');
  }
  await useAppStore.getState().fetchData();
}

/**
 * Move a folder to a different parent folder (or null for root).
 */
export async function moveFolder(id: string, parentId: string | null): Promise<void> {
  const res = await authFetch(`/api/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to move folder');
  }
  await useAppStore.getState().fetchData();
}

/**
 * Bulk move multiple folders.
 */
export async function bulkMoveFolders(ids: string[], parentId: string | null): Promise<void> {
  const res = await authFetch('/api/folders/bulk-move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, parentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to move folders');
  }
  await useAppStore.getState().fetchData();
}


/**
 * Delete a folder and all its contents.
 */
export async function deleteFolder(id: string): Promise<void> {
  const res = await authFetch(`/api/folders/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete folder');
  }
  await useAppStore.getState().fetchData();
}

/**
 * Empty the trash: permanently delete all soft-deleted documents.
 */
export async function emptyTrash(): Promise<void> {
  await authFetch('/api/documents/empty-trash', {
    method: 'POST',
  });
  await useAppStore.getState().fetchData();
}
