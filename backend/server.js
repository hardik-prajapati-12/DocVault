import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import docRoutes from './routes/documents.js';
import folderRoutes from './routes/folders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static asset serving for local file storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/documents', docRoutes);
app.use('/api/folders', folderRoutes);

// Serve static assets from frontend build in production / if built
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
  });
} else {
  // Fallback message
  app.get('/', (req, res) => {
    res.send('DocVault MERN Stack Backend running successfully.');
  });
}

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/docvault';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
  });
