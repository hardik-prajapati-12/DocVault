/**
 * Sync Service — Handles bi-directional, conflict-resolved synchronization
 * between local MERN backend storage and a remote WebDAV server.
 */

import { WebDAVClient } from './webdav-client';
import { getFileBlob } from '@/services/file-service';
import { useAppStore } from '@/store/app-store';
import type { DocFile, Folder } from '@/types';
import toast from 'react-hot-toast';

interface SyncMetadata {
  documents: DocFile[];
  folders: Folder[];
  deletedIds: Record<string, number>; // Maps fileId -> deletion timestamp
}

const SYNC_FOLDER = 'DocVault';
const METADATA_FILE = `${SYNC_FOLDER}/metadata.json`;

export class SyncService {
  private client: WebDAVClient;

  constructor() {
    const { webdavUrl, webdavUsername, webdavPassword } = useAppStore.getState();
    this.client = new WebDAVClient(webdavUrl, webdavUsername, webdavPassword);
  }

  /**
   * Run the sync engine.
   */
  async sync(): Promise<void> {
    const { syncProvider, isOnline } = useAppStore.getState();
    if (syncProvider === 'none') return;
    if (!isOnline) {
      toast.error('Offline — Cannot sync to cloud');
      return;
    }

    const toastId = toast.loading('Syncing with cloud...');

    try {
      // 1. Ensure sync folder exists
      await this.client.createFolder(SYNC_FOLDER);

      // 2. Fetch remote metadata
      let remoteMeta: SyncMetadata = { documents: [], folders: [], deletedIds: {} };
      try {
        const metaBlob = await this.client.downloadFile(METADATA_FILE);
        const metaText = await metaBlob.text();
        remoteMeta = JSON.parse(metaText);
      } catch {
        // Metadata doesn't exist yet, we will create it at the end
      }

      // 3. Load local database contents from MERN Zustand store
      const localDocs = useAppStore.getState().documents;
      const localFolders = useAppStore.getState().folders;

      // Create lookup maps
      const localDocMap = new Map<string, DocFile>();
      localDocs.forEach((d) => localDocMap.set(d.id, d));

      const remoteDocMap = new Map<string, DocFile>();
      remoteMeta.documents.forEach((d) => {
        // Convert date strings back to Date objects
        d.createdAt = new Date(d.createdAt);
        d.modifiedAt = new Date(d.modifiedAt);
        d.uploadedAt = new Date(d.uploadedAt);
        if (d.deletedAt) d.deletedAt = new Date(d.deletedAt);
        remoteDocMap.set(d.id, d);
      });

      // Merge deleted logs
      const mergedDeletedIds = { ...remoteMeta.deletedIds };
      localDocs.forEach((d) => {
        if (d.isDeleted === 1 && d.deletedAt) {
          mergedDeletedIds[d.id] = new Date(d.deletedAt).getTime();
        }
      });

      // Track actions to perform
      const docsToUpload: DocFile[] = [];
      const docsToDownload: string[] = [];
      const docsToDeleteLocally: string[] = [];
      const docsToDeleteRemotely: string[] = [];

      // Combine all file IDs
      const allFileIds = new Set([
        ...localDocMap.keys(),
        ...remoteDocMap.keys(),
        ...Object.keys(mergedDeletedIds),
      ]);

      for (const id of allFileIds) {
        const local = localDocMap.get(id);
        const remote = remoteDocMap.get(id);
        const isDeletedRemotely = !!mergedDeletedIds[id];

        // Case A: File deleted on either side
        if (isDeletedRemotely) {
          if (local && local.isDeleted === 0) {
            // Deleted remotely, but active locally -> soft delete locally
            docsToDeleteLocally.push(id);
          }
          if (remote) {
            // Make sure remote file is cleaned up from storage
            docsToDeleteRemotely.push(id);
          }
          continue;
        }

        // Case B: File exists on both sides -> Compare modification dates
        if (local && remote) {
          const localTime = new Date(local.modifiedAt).getTime();
          const remoteTime = new Date(remote.modifiedAt).getTime();

          if (localTime > remoteTime) {
            docsToUpload.push(local);
          } else if (remoteTime > localTime) {
            docsToDownload.push(id);
          }
        }
        // Case C: File exists only locally
        else if (local && !remote) {
          if (local.isDeleted === 1) {
            // Already soft-deleted locally, push to deleted list
            mergedDeletedIds[id] = local.deletedAt ? new Date(local.deletedAt).getTime() : Date.now();
          } else {
            docsToUpload.push(local);
          }
        }
        // Case D: File exists only remotely
        else if (remote && !local) {
          docsToDownload.push(id);
        }
      }

      // ── Process Uploads ──
      for (const doc of docsToUpload) {
        const blob = await getFileBlob(doc.id);
        if (blob) {
          await this.client.uploadFile(`${SYNC_FOLDER}/${doc.id}`, blob);
          remoteDocMap.set(doc.id, doc);
        }
      }

      // ── Process Downloads ──
      for (const id of docsToDownload) {
        const remoteDoc = remoteDocMap.get(id);
        if (remoteDoc) {
          try {
            const blob = await this.client.downloadFile(`${SYNC_FOLDER}/${id}`);
            const fileOfBlob = new File([blob], remoteDoc.name, { type: remoteDoc.mimeType });
            const formData = new FormData();
            formData.append('file', fileOfBlob);
            formData.append('id', remoteDoc.id);
            formData.append('name', remoteDoc.name);
            formData.append('extension', remoteDoc.extension);
            formData.append('mimeType', remoteDoc.mimeType);
            formData.append('folderId', remoteDoc.folderId || '');
            formData.append('isFavorite', String(remoteDoc.isFavorite));
            formData.append('isArchived', String(remoteDoc.isArchived));
            formData.append('isDeleted', String(remoteDoc.isDeleted));
            formData.append('createdAt', new Date(remoteDoc.createdAt).toISOString());
            formData.append('modifiedAt', new Date(remoteDoc.modifiedAt).toISOString());
            if (remoteDoc.thumbnailDataUrl) {
              formData.append('thumbnailDataUrl', remoteDoc.thumbnailDataUrl);
            }
            if (remoteDoc.tags) {
              formData.append('tags', JSON.stringify(remoteDoc.tags));
            }

            const res = await fetch('/api/documents/upload', {
              method: 'POST',
              body: formData,
            });
            if (!res.ok) {
              throw new Error(`Upload to backend failed: ${res.statusText}`);
            }
            const savedDoc = await res.json();
            localDocMap.set(id, savedDoc);
          } catch (e) {
            console.error(`Failed to download file ${id}:`, e);
          }
        }
      }

      // ── Process Local Deletions ──
      for (const id of docsToDeleteLocally) {
        const local = localDocMap.get(id);
        if (local) {
          await fetch(`/api/documents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isDeleted: 1,
              deletedAt: new Date(mergedDeletedIds[id] || Date.now()),
            }),
          });
        }
      }

      // ── Process Remote Deletions (and delete binary files on WebDAV) ──
      for (const id of docsToDeleteRemotely) {
        await this.client.deleteFile(`${SYNC_FOLDER}/${id}`);
        remoteDocMap.delete(id);
      }

      // ── Sync Folders ──
      const foldersToImport = [];
      const mergedFolders = [...localFolders];
      for (const rf of remoteMeta.folders) {
        rf.createdAt = new Date(rf.createdAt);
        rf.modifiedAt = new Date(rf.modifiedAt);
        const exists = localFolders.some((lf) => lf.id === rf.id);
        if (!exists) {
          foldersToImport.push(rf);
          mergedFolders.push(rf);
        }
      }
      if (foldersToImport.length > 0) {
        const res = await fetch('/api/folders/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folders: foldersToImport }),
        });
        if (!res.ok) {
          throw new Error(`Folder import failed: ${res.statusText}`);
        }
      }

      // ── Save Updated Metadata to WebDAV ──
      const updatedMeta: SyncMetadata = {
        documents: Array.from(remoteDocMap.values()),
        folders: mergedFolders,
        deletedIds: mergedDeletedIds,
      };

      const metaBlob = new Blob([JSON.stringify(updatedMeta, null, 2)], {
        type: 'application/json',
      });
      await this.client.uploadFile(METADATA_FILE, metaBlob);

      // Save sync complete
      useAppStore.getState().setLastSyncedAt(Date.now());
      // Refresh local store from MERN backend
      await useAppStore.getState().fetchData();
      toast.success('Sync complete!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Sync failed', { id: toastId });
    }
  }
}
