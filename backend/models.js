import mongoose from 'mongoose';

const FolderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  parentId: { type: String, default: null },
  isDeleted: { type: Number, enum: [0, 1], default: 0 },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now }
});

const DocFileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  extension: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  tags: { type: [String], default: [] },
  folderId: { type: String, default: null },
  isFavorite: { type: Number, enum: [0, 1], default: 0 },
  isArchived: { type: Number, enum: [0, 1], default: 0 },
  isDeleted: { type: Number, enum: [0, 1], default: 0 },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
  uploadedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
  compressedSize: { type: Number, default: null },
  opfsPath: { type: String, default: '' },
  thumbnailDataUrl: { type: String, default: null },
  cloudinaryUrl: { type: String, default: null },
  localUrl: { type: String, default: null }
});

export const Folder = mongoose.model('Folder', FolderSchema);
export const DocFile = mongoose.model('DocFile', DocFileSchema);
