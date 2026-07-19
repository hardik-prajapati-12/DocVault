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

// Recursive folder deletion helper
async function deleteFolderAndContents(folderId) {
  // Move documents in this folder to root
  await DocFile.updateMany({ folderId }, { folderId: null });
  // Find child folders
  const subFolders = await Folder.find({ parentId: folderId });
  for (const sub of subFolders) {
    await deleteFolderAndContents(sub.id);
  }
  // Delete the folder itself
  await Folder.deleteOne({ id: folderId });
}

// Delete folder
router.delete('/:id', async (req, res) => {
  try {
    await deleteFolderAndContents(req.params.id);
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

// Bulk Delete folders
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    for (const id of ids) {
      await deleteFolderAndContents(id);
    }
    res.json({ message: 'Folders deleted successfully' });
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
