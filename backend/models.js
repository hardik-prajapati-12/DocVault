import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  profilePhoto: { type: String, default: null },
  password: { type: String, required: true },
  archivePasswordHash: { type: String, default: null },
  archiveSecurityQuestion: { type: String, default: null },
  archiveSecurityAnswerHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const FolderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  parentId: { type: String, default: null },
  userId: { type: String, default: 'default-user' },
  isDeleted: { type: Number, enum: [0, 1], default: 0 },
  deletedAt: { type: Date, default: null },
  isFavorite: { type: Number, enum: [0, 1], default: 0 },
  isArchived: { type: Number, enum: [0, 1], default: 0 },
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
  userId: { type: String, default: 'default-user' },
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
  cloudinaryPublicId: { type: String, default: null },
  cloudinaryResourceType: { type: String, default: null },
  localUrl: { type: String, default: null },
  fileDataBuffer: { type: Buffer, default: null }
});

export const User = mongoose.model('User', UserSchema);
export const Folder = mongoose.model('Folder', FolderSchema);
export const DocFile = mongoose.model('DocFile', DocFileSchema);
