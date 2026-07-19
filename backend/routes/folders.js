import express from 'express';
import { Folder, DocFile } from '../models.js';

const router = express.Router();

// Get all folders
router.get('/', async (req, res) => {
  try {
    const folders = await Folder.find({});
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create folder
router.post('/', async (req, res) => {
  try {
    const { id, name, parentId } = req.body;
    const newFolder = new Folder({
      id,
      name,
      parentId: parentId || null,
      createdAt: new Date(),
      modifiedAt: new Date()
    });
    await newFolder.save();
    res.status(201).json(newFolder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename folder
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await Folder.findOneAndUpdate(
      { id: req.params.id },
      { name, modifiedAt: new Date() },
      { new: true }
    );
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recursive folder soft deletion helper
async function softDeleteFolderAndContents(folderId, isDeleted) {
  const deletedAt = isDeleted === 1 ? new Date() : null;
  // Soft-delete the folder itself
  await Folder.findOneAndUpdate(
    { id: folderId },
    { isDeleted, deletedAt, modifiedAt: new Date() }
  );
  // Soft-delete all documents inside this folder
  await DocFile.updateMany(
    { folderId },
    { isDeleted, deletedAt, modifiedAt: new Date() }
  );
  // Find child folders and soft-delete recursively
  const subFolders = await Folder.find({ parentId: folderId });
  for (const sub of subFolders) {
    await softDeleteFolderAndContents(sub.id, isDeleted);
  }
}

// Recursive folder permanent deletion helper
async function permanentDeleteFolderAndContents(folderId) {
  // Find child folders
  const subFolders = await Folder.find({ parentId: folderId });
  for (const sub of subFolders) {
    await permanentDeleteFolderAndContents(sub.id);
  }
  // Hard-delete the files inside this folder
  await DocFile.deleteMany({ folderId });
  // Hard-delete the folder itself
  await Folder.deleteOne({ id: folderId });
}

// Delete folder (Soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await softDeleteFolderAndContents(req.params.id, 1);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import/Upsert Folder Metadata
router.post('/import', async (req, res) => {
  try {
    const { folders } = req.body;
    if (!Array.isArray(folders)) {
      return res.status(400).json({ error: 'folders must be an array' });
    }
    for (const f of folders) {
      await Folder.findOneAndUpdate(
        { id: f.id },
        {
          ...f,
          createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
          modifiedAt: f.modifiedAt ? new Date(f.modifiedAt) : new Date(),
        },
        { upsert: true }
      );
    }
    res.json({ message: 'Folders imported successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Delete folders (Soft delete)
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    for (const id of ids) {
      await softDeleteFolderAndContents(id, 1);
    }
    res.json({ message: 'Folders deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Restore folders
router.post('/bulk-restore', async (req, res) => {
  try {
    const { ids } = req.body;
    for (const id of ids) {
      await softDeleteFolderAndContents(id, 0);
    }
    res.json({ message: 'Folders restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Delete folders permanently
router.post('/bulk-delete-permanent', async (req, res) => {
  try {
    const { ids } = req.body;
    for (const id of ids) {
      await permanentDeleteFolderAndContents(id);
    }
    res.json({ message: 'Folders permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recursive folder duplication helper
async function duplicateFolderAndContents(folderId, newParentId, suffix = ' copy') {
  const original = await Folder.findOne({ id: folderId });
  if (!original) return null;

  const newFolderId = 'fld_' + Math.random().toString(36).substring(2, 15);
  const duplicatedFolder = new Folder({
    id: newFolderId,
    name: original.name + suffix,
    parentId: newParentId,
    isFavorite: original.isFavorite,
    isArchived: original.isArchived,
    isDeleted: original.isDeleted,
    createdAt: new Date(),
    modifiedAt: new Date()
  });
  await duplicatedFolder.save();

  // Duplicate files inside this folder
  const files = await DocFile.find({ folderId });
  for (const file of files) {
    const newFileId = 'doc_' + Math.random().toString(36).substring(2, 15);
    const duplicatedFile = new DocFile({
      ...file.toObject(),
      _id: undefined, // Mongoose generates a new object ID
      id: newFileId,
      name: file.name,
      folderId: newFolderId,
      createdAt: new Date(),
      modifiedAt: new Date(),
      uploadedAt: new Date()
    });
    await duplicatedFile.save();
  }

  // Duplicate subfolders recursively
  const subFolders = await Folder.find({ parentId: folderId });
  for (const sub of subFolders) {
    await duplicateFolderAndContents(sub.id, newFolderId, ''); // No suffix recursively
  }

  return newFolderId;
}

// Duplicate folder
router.post('/:id/duplicate', async (req, res) => {
  try {
    const newId = await duplicateFolderAndContents(req.params.id, null);
    res.status(201).json({ message: 'Folder duplicated successfully', id: newId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update folder favorite status
router.put('/:id/favorite', async (req, res) => {
  try {
    const { isFavorite } = req.body;
    const folder = await Folder.findOneAndUpdate(
      { id: req.params.id },
      { isFavorite, modifiedAt: new Date() },
      { new: true }
    );
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update folder archive status
router.put('/:id/archive', async (req, res) => {
  try {
    const { isArchived } = req.body;
    const folder = await Folder.findOneAndUpdate(
      { id: req.params.id },
      { isArchived, modifiedAt: new Date() },
      { new: true }
    );
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear All Folders (App Reset)
router.post('/clear-all', async (req, res) => {
  try {
    await Folder.deleteMany({});
    res.json({ message: 'All folders cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
