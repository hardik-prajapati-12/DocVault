# DocVault — Cloud Document Management System

DocVault is a production-ready, cloud-based document management application built on the MERN stack (MongoDB, Express, React, Node.js) with TypeScript. It provides a secure, multi-user platform for uploading, organizing, previewing, compressing, and managing files and folders from any device.

**Live Demo**: [doc-vault-frontend-omega.vercel.app](https://doc-vault-frontend-omega.vercel.app)

---

## 📂 Architecture & Folder Structure

The project is structured as a monorepo containing a separate frontend client and backend server:

```
DocVault/
├── backend/              # Express.js Server
│   ├── middleware/        # JWT authentication middleware
│   ├── routes/            # Auth, Document, and Folder API endpoints
│   ├── uploads/           # Local disk storage for file assets
│   ├── models.js          # Mongoose schemas (User, Folder, DocFile)
│   ├── server.js          # Express app and MongoDB connection
│   └── package.json
├── frontend/             # React + TypeScript SPA (Vite)
│   ├── src/              # Component views, Zustand stores, hooks, services
│   ├── public/           # Static assets (Favicon, icons)
│   ├── index.html        # Main HTML entry point
│   ├── vite.config.ts    # Vite configs and API reverse-proxy setup
│   └── package.json
├── package.json          # Root workspace script runner
└── README.md
```

---

## ✨ Features

### 🔐 Authentication & Multi-User Support
- **User Registration & Login**: Secure account creation with bcrypt password hashing and JWT token-based authentication.
- **Multi-User Data Isolation**: Each user has their own private vault. Files and folders are strictly scoped per user — no cross-user access is possible.
- **Automatic Session Management**: JWT tokens are auto-attached to all API requests via a global fetch interceptor. Expired tokens trigger automatic redirect to the login page.
- **User Profile & Logout**: Header displays the logged-in username with a dropdown to sign out.

### 📁 File Management
- **Cloud + Local Storage**: Uploaded files are concurrently written to local server disk storage and uploaded to Cloudinary for cloud hosting.
- **Dynamic Previews**: Built-in rendering for images, videos, audio, PDFs (via pdf.js), markdown (with syntax highlighting), and Microsoft Office documents (via Office Online Viewer).
- **Client-Side Compression**: Compress PDFs (with quality presets, metadata pruning, font optimization) and images (canvas-based resizing, quality control, grayscale conversion) directly in the browser before downloading.
- **Fast Downloads**: Server-side file streaming with `Content-Disposition` headers for instant browser save dialogs.

### 📊 Dashboard & Organization
- **Dashboard Statistics**: Interactive Recharts visualizations showing folder distribution, active files, storage usage, and recent uploads.
- **Hierarchical Folders**: Create nested folder trees with recursive duplication, archiving, and restoration.
- **Favorites & Star Badges**: Mark folders and files as favorites with visual star indicators across all views.
- **Flexible Views**: Grid mode with glassmorphism cards and list mode with detailed file metadata.
- **Multi-Criteria Sorting**: Sort by name (A-Z, Z-A), date (newest, oldest), size (largest, smallest), extension, and recently modified.
- **Smart Filtering**: Filter by file type (images, videos, audio, PDFs, documents, archives, code, executables), favorites, and file size.

### 🗑️ Trash & Recovery
- **Soft Delete & Restore**: Deleted items move to trash and can be restored to their original location.
- **Permanent Deletion**: Permanently remove files from both local disk and database.
- **Empty Trash**: Bulk-delete all trashed items with a single action.

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a cloud cluster)

### Configuration

Create a `.env` file in the `backend/` directory with the following environment variables:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/docvault

# Cloudinary configuration (Register at cloudinary.com to get credentials)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# JWT Secret for user authentication (use a strong, random string)
JWT_SECRET=your_jwt_secret_key
```

> **Important**: Never commit your `.env` file or credentials to version control.

### Installation

Install all backend and frontend dependencies by running the monorepo installer in the project root:

```bash
npm run install:all
```

### Running in Development Mode

Start the Vite development frontend and Express backend concurrently:

```bash
npm run dev
```

- **Frontend client**: served at `http://localhost:5173`
- **Backend API**: running at `http://localhost:5000` (all requests to `/api` and `/uploads` are automatically reverse-proxied by Vite)

---

## 🚀 Building & Deploying for Production

### 1. Compile React Frontend

```bash
npm run build
```

This builds, optimizes, and outputs the production bundle inside `frontend/dist/`.

### 2. Run Backend Web Server

```bash
npm run dev:backend
# or
node backend/server.js
```

The backend includes automatic static file hosting — if a production bundle is detected inside `frontend/dist/`, the server will serve the client directly on port `5000` (or `process.env.PORT`).

Visit `http://localhost:5000` to use the full application.

### 3. Environment Variables for Production

When deploying to platforms like Render or Railway, set these environment variables:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `JWT_SECRET` | Secret key for signing JWT tokens |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Zustand, Framer Motion, Recharts, Tailwind CSS |
| **Backend** | Node.js, Express.js, Mongoose, Multer |
| **Database** | MongoDB Atlas |
| **Cloud Storage** | Cloudinary |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs |
| **Deployment** | Vercel (Frontend) + Render (Backend) |

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
