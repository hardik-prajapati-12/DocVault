# DocVault — Document Management System

DocVault is a production-ready, professional document management application built on the MERN stack (MongoDB, Express, React, Node.js) with TypeScript. It allows users to upload, organize, preview, and manage files and folders seamlessly.

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
- **Stable State Synchronization**: Queries local or cloud urls via the backend API and stores them in a reactive Zustand global state layer, completely replacing Dexie/IndexedDB database queries.
- **Dynamic Previews**: Built-in rendering support for images, videos, audio streams, PDF manuals, markdown notes, and source code files with dynamic syntax highlighting.
- **Dashboard Statistics**: Interactive Recharts interfaces visualizing folder splits, active files, overall storage quotas, and recent uploads.
- **Organization Utilities**: Multilevel folder nesting, custom file tags, archiving panels, trashing mechanisms (soft deletion), duplication options, and bulk download compression.
- **Monorepo Execution**: Start both the frontend and backend servers simultaneously with a single terminal command using `concurrently`.

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a cluster link)

### Configuration

Create a `.env` file in the `backend/` directory by referring to the configuration template:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_uri

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Installation

Install all backend and frontend dependencies by running the monorepo installer in the project root:

```bash
npm run install:all
```

### Launching the Application

Start the Vite development frontend and Express backend concurrently from the root directory:

```bash
npm run dev
```

- **Frontend client**: served at `http://localhost:5173`
- **Backend API**: running at `http://localhost:5000` (all requests to `/api` and `/uploads` are automatically reverse-proxied by Vite)

---

## 🚀 Building for Production

To compile and bundle the React frontend client into static files:

```bash
npm run build
```
The output will be placed inside `frontend/dist/`, optimized and ready for static server deployment.
