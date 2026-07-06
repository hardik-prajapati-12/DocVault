import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/components/layout';

// Lazy load pages for code splitting
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const FilesPage = React.lazy(() => import('@/pages/FilesPage'));
const FavoritesPage = React.lazy(() => import('@/pages/FavoritesPage'));
const ArchivePage = React.lazy(() => import('@/pages/ArchivePage'));
const TrashPage = React.lazy(() => import('@/pages/TrashPage'));
const ConverterPage = React.lazy(() => import('@/pages/ConverterPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'files',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FilesPage />
          </Suspense>
        ),
      },
      {
        path: 'favorites',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FavoritesPage />
          </Suspense>
        ),
      },
      {
        path: 'archive',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ArchivePage />
          </Suspense>
        ),
      },
      {
        path: 'trash',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TrashPage />
          </Suspense>
        ),
      },
      {
        path: 'converter',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ConverterPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export const AppRouter: React.FC = () => <RouterProvider router={router} />;
