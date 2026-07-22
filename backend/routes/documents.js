import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { Folder, DocFile } from '../models.js';
import { authMiddleware } from '../middleware/auth.js';
import https from 'https';
import http from 'http';

const router = express.Router();

// Protect all document routes with authentication
router.use(authMiddleware);

// Ensure local uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get all documents
router.get('/', async (req, res) => {
  try {
    const docs = await DocFile.find({ userId: req.user.id });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload file (single file at a time, for precise progress logging)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { id, folderId, createdAt, modifiedAt, thumbnailDataUrl } = req.body;

    // Upload to Cloudinary
    let cloudinaryUrl = null;
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        folder: 'docvault'
      });
      cloudinaryUrl = result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      // We will fallback to only local if Cloudinary fails, but keep proceeding
    }

    // Local file path/URL
    const localUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const doc = await DocFile.findOneAndUpdate(
      { id },
      {
        id,
        name: req.body.name || req.file.originalname,
        extension: req.body.extension || path.extname(req.file.originalname).slice(1),
        mimeType: req.body.mimeType || req.file.mimetype,
        size: req.file.size,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        folderId: folderId || null,
        userId: req.user.id,
        isFavorite: Number(req.body.isFavorite) || 0,
        isArchived: Number(req.body.isArchived) || 0,
        isDeleted: Number(req.body.isDeleted) || 0,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        modifiedAt: modifiedAt ? new Date(modifiedAt) : new Date(),
        uploadedAt: new Date(),
        deletedAt: null,
        compressedSize: req.body.compressedSize ? Number(req.body.compressedSize) : null,
        opfsPath: req.file.filename, // We can store the local filename as opfsPath
        thumbnailDataUrl: thumbnailDataUrl || null,
        cloudinaryUrl,
        localUrl
      },
      { upsert: true, new: true }
    );

    res.status(201).json(doc);
  } catch (error) {
    console.error('Document upload endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update document metadata (rename, move, favorite, archive, trash)
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, modifiedAt: new Date() };
    const doc = await DocFile.findOneAndUpdate(
      { id: req.params.id, userId: req.user.id },
      updates,
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Duplicate document
router.post('/duplicate/:id', async (req, res) => {
  try {
    const original = await DocFile.findOne({ id: req.params.id, userId: req.user.id });
    if (!original) return res.status(404).json({ error: 'Original document not found' });

    const newId = req.body.newId;
    const newName = req.body.newName;

    let duplicateLocalUrl = null;
    let duplicateFilename = null;

    // Copy local file physically
    if (original.opfsPath) {
      const srcPath = path.join(uploadDir, original.opfsPath);
      if (fs.existsSync(srcPath)) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(original.name);
        duplicateFilename = `file-${uniqueSuffix}${ext}`;
        const destPath = path.join(uploadDir, duplicateFilename);
        fs.copyFileSync(srcPath, destPath);
        duplicateLocalUrl = `${req.protocol}://${req.get('host')}/uploads/${duplicateFilename}`;
      }
    }

    const duplicate = new DocFile({
      id: newId,
      name: newName,
      extension: original.extension,
      mimeType: original.mimeType,
      size: original.size,
      tags: original.tags,
      folderId: original.folderId,
      userId: req.user.id,
      isFavorite: 0,
      isArchived: original.isArchived,
      isDeleted: 0,
      createdAt: new Date(),
      modifiedAt: new Date(),
      uploadedAt: new Date(),
      deletedAt: null,
      compressedSize: original.compressedSize,
      opfsPath: duplicateFilename || original.opfsPath,
      thumbnailDataUrl: original.thumbnailDataUrl,
      cloudinaryUrl: original.cloudinaryUrl, // Cloudinary link can be shared/copied
      localUrl: duplicateLocalUrl || original.localUrl
    });

    await duplicate.save();
    res.json(duplicate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Permanent Delete
router.delete('/:id/permanent', async (req, res) => {
  try {
    const doc = await DocFile.findOne({ id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // 1. Delete local file from disk
    if (doc.opfsPath) {
      const filePath = path.join(uploadDir, doc.opfsPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 2. Delete from MongoDB
    await DocFile.deleteOne({ id: req.params.id, userId: req.user.id });

    // Note: Deleting from Cloudinary is asynchronous/optional but good practice:
    // If we wanted to, we could extract the public_id and delete it. Let's keep it simple.
    res.json({ message: 'Document permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Soft Delete
router.post('/bulk-soft-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    await DocFile.updateMany(
      { id: { $in: ids }, userId: req.user.id },
      { isDeleted: 1, deletedAt: new Date(), modifiedAt: new Date() }
    );
    res.json({ message: 'Documents soft deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Permanent Delete
router.post('/bulk-permanent-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    const docs = await DocFile.find({ id: { $in: ids }, userId: req.user.id });
    for (const doc of docs) {
      if (doc.opfsPath) {
        const filePath = path.join(uploadDir, doc.opfsPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    await DocFile.deleteMany({ id: { $in: ids }, userId: req.user.id });
    res.json({ message: 'Documents permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Restore
router.post('/bulk-restore', async (req, res) => {
  try {
    const { ids } = req.body;
    await DocFile.updateMany(
      { id: { $in: ids }, userId: req.user.id },
      { isDeleted: 0, deletedAt: null, modifiedAt: new Date() }
    );
    res.json({ message: 'Documents restored' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Empty trash
router.post('/empty-trash', async (req, res) => {
  try {
    const trashedDocs = await DocFile.find({ isDeleted: 1, userId: req.user.id });
    for (const doc of trashedDocs) {
      if (doc.opfsPath) {
        const filePath = path.join(uploadDir, doc.opfsPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    await DocFile.deleteMany({ isDeleted: 1, userId: req.user.id });
    await Folder.deleteMany({ isDeleted: 1, userId: req.user.id });
    res.json({ message: 'Trash emptied' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import/Upsert Document Metadata
router.post('/import', async (req, res) => {
  try {
    const { documents } = req.body;
    if (!Array.isArray(documents)) {
      return res.status(400).json({ error: 'documents must be an array' });
    }
    for (const d of documents) {
      await DocFile.findOneAndUpdate(
        { id: d.id },
        {
          ...d,
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          modifiedAt: d.modifiedAt ? new Date(d.modifiedAt) : new Date(),
          uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date(),
          deletedAt: d.deletedAt ? new Date(d.deletedAt) : null,
        },
        { upsert: true }
      );
    }
    res.json({ message: 'Documents imported successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear All Documents (App Reset)
router.post('/clear-all', async (req, res) => {
  try {
    const docs = await DocFile.find({ userId: req.user.id });
    for (const doc of docs) {
      if (doc.opfsPath) {
        const filePath = path.join(uploadDir, doc.opfsPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    await DocFile.deleteMany({ userId: req.user.id });
    res.json({ message: 'All documents cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Archive
router.post('/bulk-archive', async (req, res) => {
  try {
    const { ids, isArchived } = req.body;
    await DocFile.updateMany(
      { id: { $in: ids }, userId: req.user.id },
      { isArchived: isArchived !== undefined ? isArchived : 1, modifiedAt: new Date() }
    );
    res.json({ message: 'Documents archived status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Favorite
router.post('/bulk-favorite', async (req, res) => {
  try {
    const { ids, isFavorite } = req.body;
    await DocFile.updateMany(
      { id: { $in: ids }, userId: req.user.id },
      { isFavorite: isFavorite !== undefined ? isFavorite : 1, modifiedAt: new Date() }
    );
    res.json({ message: 'Documents favorite status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Move
router.post('/bulk-move', async (req, res) => {
  try {
    const { ids, folderId } = req.body;
    await DocFile.updateMany(
      { id: { $in: ids }, userId: req.user.id },
      { folderId: folderId || null, modifiedAt: new Date() }
    );
    res.json({ message: 'Documents moved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get file binary (handles local disk and streaming from Cloudinary as fallback)
router.get('/:id/file', async (req, res) => {
  try {
    const doc = await DocFile.findOne({ id: req.params.id, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isDownload = req.query.download === 'true';

    // 1. Try serving from local disk first
    if (doc.opfsPath) {
      const localPath = path.join('uploads', doc.opfsPath);
      if (fs.existsSync(localPath)) {
        if (isDownload) {
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
        }
        return res.sendFile(path.resolve(localPath));
      }
    }

    // 2. If missing from local disk, fallback to streaming from Cloudinary
    if (doc.cloudinaryUrl) {
      console.log(`Local file missing. Fetching from Cloudinary: ${doc.cloudinaryUrl}`);
      
      const downloadUrl = doc.cloudinaryUrl;

      const urlObj = new URL(downloadUrl);
      const client = urlObj.protocol === 'https:' ? https : http;

      client.get(downloadUrl, (cloudinaryRes) => {
        if (cloudinaryRes.statusCode >= 400) {
          console.error(`Cloudinary returned status code ${cloudinaryRes.statusCode} for URL: ${downloadUrl}`);
          const statusCode = (cloudinaryRes.statusCode === 401 || cloudinaryRes.statusCode === 403) ? 502 : cloudinaryRes.statusCode;
          return res.status(statusCode).json({ error: 'Failed to retrieve file from cloud storage' });
        }

        res.setHeader('Content-Type', doc.mimeType || cloudinaryRes.headers['content-type'] || 'application/octet-stream');
        if (cloudinaryRes.headers['content-length']) {
          res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
        }

        if (isDownload) {
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
        }

        cloudinaryRes.pipe(res);
      }).on('error', (err) => {
        console.error('Error streaming from Cloudinary:', err);
        res.status(500).json({ error: 'Internal server error while retrieving file' });
      });
      return;
    }

    return res.status(404).json({ error: 'File data not found on server or cloud' });
  } catch (error) {
    console.error('Error retrieving file endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
