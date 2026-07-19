# DocVault — Enterprise Document Management System

DocVault is a production-ready, offline-first, professional document management application built on the MERN stack (MongoDB, Express, React, Node.js) with TypeScript. It provides a robust, modern interface for uploading, organizing, previewing, and managing files and folders.

---

## 📂 Architecture & Folder Structure

The project is structured as a monorepo containing a separate frontend client and backend server:

```
DocVault/
├── backend/            # Express.js Server
│   ├── routes/         # Document and Folder API endpoints
│   ├── uploads/        # Local disk storage for file assets
│   ├── models.js       # Mongoose schemas (Folder, DocFile)
│   ├── server.js       # Express app and MongoDB connection
│   └── package.json
├── frontend/           # React + TypeScript SPA (Vite)
│   ├── src/            # Component views, Zustand stores, hooks, services
│   ├── public/         # Static assets (Favicon, PWA manifest, worker scripts)
│   ├── index.html      # Main HTML entry point
│   ├── vite.config.ts  # Vite configs and API reverse-proxy setup
│   └── package.json
├── package.json        # Root workspace script runner
└── README.md
```

---

## ✨ Features

- **Double File Storage**: Uploaded files are concurrently written to local server disk storage (in the `uploads/` folder) and uploaded to Cloudinary for robust cloud URL hosting.
- **Stable State Synchronization**: Queries local or cloud URLs via the backend API and stores them in a reactive Zustand global state layer.
- **Dynamic Previews**: Built-in rendering support for images, videos, audio streams, PDF manuals, markdown notes, and source code files with dynamic syntax highlighting.
- **Dashboard Statistics**: Interactive Recharts interfaces visualizing folder splits, active files, overall storage quotas, and recent uploads.
- **Hierarchical Folders & Recursive Duplication**: Create nested folder trees. Users can recursively duplicate folders, copying all nested child folders and files into a new replica.
- **Recursive Archive & Restore**: Archive a folder to automatically archive all contained files and subfolders. Unarchiving restores the directory structure.
- **Favorites & Star Badge Indicators**: Mark folders and files as favorites. Favorite icons (star badges) display in both Folder and Favorite tabs across all layout viewports.
- **Delete & Archive Confirmation Popups**:
  - Modal warnings prevent accidental folder/file modification.
  - Context menu items for archive, unarchive, and deletion prompt for confirmation.
  - Bulk actions trigger confirmation popups displaying total file counts and safety warnings (e.g., notifying that nested documents inside selected directories will be moved).
- **Flexible Grid and List Views**: Grid and list display modes apply to both files and folders. Grid mode shows elegant glassmorphism cards, and list mode renders folder rows (including sub-item counters, file sizes, type categories, and creation dates) styled alongside the document table.
- **Multi-criteria Sorting**: Concurrently sort folders and files by Name (A-Z, Z-A), Creation Date (Newest, Oldest), and Recently Modified dates.
- **Production-Ready SPA Serving**: In production mode, the backend dynamically hosts the React frontend build bundle (from `frontend/dist`), serving the web application and backend API under a single port.
- **Offline-First PWA Capabilities**: Built-in Progressive Web App service workers cache static assets, icons, layouts, and Google Web Fonts for standalone utilities.

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a cluster link)

### Configuration

Create a `.env` file in the `backend/` directory by copying the following template. **Do not commit credentials or sensitive API keys to git.**

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/docvault

# Cloudinary configuration (Register at cloudinary.com to get credentials)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Installation

Install all backend and frontend dependencies by running the monorepo installer in the project root:

```bash
npm run install:all
```

### Running the Application in Development Mode

Start the Vite development frontend and Express backend concurrently:

```bash
npm run dev
```

- **Frontend client**: served at `http://localhost:5173`
- **Backend API**: running at `http://localhost:5000` (all requests to `/api` and `/uploads` are automatically reverse-proxied by Vite)

---

## 🚀 Building & Deploying for Production

### 1. Compile React Frontend
To compile and bundle the React frontend client into static files:

```bash
npm run build
```

This commands builds, optimizes, and outputs the production bundle inside `frontend/dist/`.

### 2. Run Backend Web Server
Start the Express server:

```bash
npm run dev:backend
# or
node backend/server.js
```

Since the backend includes automated static file hosting check, if a production bundle is detected inside `frontend/dist/`, the server will serve the client directly on port `5000` (or `process.env.PORT`). 

Simply visit `http://localhost:5000` to interact with the full web app.
