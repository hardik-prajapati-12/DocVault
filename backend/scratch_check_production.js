import mongoose from 'mongoose';
import { DocFile } from './models.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/docvault';
console.log('Connecting to', MONGODB_URI);

try {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');
  const totalDocs = await DocFile.countDocuments({});
  console.log('Total documents:', totalDocs);
  
  const docsWithoutCloudinary = await DocFile.find({ cloudinaryUrl: null }).lean();
  console.log('Documents without Cloudinary Url:', JSON.stringify(docsWithoutCloudinary, null, 2));
} catch (err) {
  console.error('Error:', err);
} finally {
  await mongoose.disconnect();
}
