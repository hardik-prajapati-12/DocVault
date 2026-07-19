import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { RouteErrorBoundary } from '@/components/ui';
import { lazyWithRetry } from '@/utils';

// Lazy load pages for code splitting with reload retry logic
const DashboardPage = lazyWithRetry(() => import('@/pages/DashboardPage'));
const FilesPage = lazyWithRetry(() => import('@/pages/FilesPage'));
const FavoritesPage = lazyWithRetry(() => import('@/pages/FavoritesPage'));
const ArchivePage = lazyWithRetry(() => import('@/pages/ArchivePage'));
const TrashPage = lazyWithRetry(() => import('@/pages/TrashPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteErrorBoundary />,
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
    ],
  },
]);

export const AppRouter: React.FC = () => <RouterProvider router={router} />;
