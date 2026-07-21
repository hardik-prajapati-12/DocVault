import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { RouteErrorBoundary } from '@/components/ui';
import { lazyWithRetry } from '@/utils';

// Lazy load pages for code splitting with reload retry logic
const HomePage = lazyWithRetry(() => import('@/pages/HomePage'));
const DashboardPage = lazyWithRetry(() => import('@/pages/DashboardPage'));
const FilesPage = lazyWithRetry(() => import('@/pages/FilesPage'));
const FavoritesPage = lazyWithRetry(() => import('@/pages/FavoritesPage'));
const ArchivePage = lazyWithRetry(() => import('@/pages/ArchivePage'));
const TrashPage = lazyWithRetry(() => import('@/pages/TrashPage'));
const FoldersPage = lazyWithRetry(() => import('@/pages/FoldersPage'));
const LoginPage = lazyWithRetry(() => import('@/pages/LoginPage'));
const PrivacyPolicyPage = lazyWithRetry(() => import('@/pages/PrivacyPolicyPage'));
const TermsPage = lazyWithRetry(() => import('@/pages/TermsPage'));
const SecurityWhitepaperPage = lazyWithRetry(() => import('@/pages/SecurityWhitepaperPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * ProtectedRoute: Checks for a valid JWT token in localStorage.
 * If no token is found, redirects the user to /landing.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('docvault-auth-token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/landing',
    element: (
      <Suspense fallback={<PageLoader />}>
        <HomePage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/home',
    element: (
      <Suspense fallback={<PageLoader />}>
        <HomePage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/privacy',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PrivacyPolicyPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/terms',
    element: (
      <Suspense fallback={<PageLoader />}>
        <TermsPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/security-whitepaper',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SecurityWhitepaperPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
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
      {
        path: 'folders',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FoldersPage />
          </Suspense>
        ),
      },
      {
        path: 'folders/:folderId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FoldersPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export const AppRouter: React.FC = () => <RouterProvider router={router} />;
