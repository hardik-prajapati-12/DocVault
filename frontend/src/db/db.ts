import Dexie, { type EntityTable } from 'dexie';
import type { DocFile, Folder, AppSettings } from '@/types';

const db = new Dexie('DocVaultDB') as Dexie & {
  documents: EntityTable<DocFile, 'id'>;
  folders: EntityTable<Folder, 'id'>;
  settings: EntityTable<AppSettings, 'key'>;
};

db.version(2).stores({
  documents:
    'id, name, extension, mimeType, size, folderId, isFavorite, isArchived, isDeleted, createdAt, modifiedAt, uploadedAt, deletedAt, *tags',
  folders: 'id, name, parentId, createdAt',
  settings: 'key',
});

export { db };
