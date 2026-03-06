import { createBrowserRouter, RouterProvider as RRProvider, useRouteError } from 'react-router-dom';
import { ErrorFallback } from '@/components/ui/error-boundary.tsx';
import { HomePage } from './routes/home.tsx';
import { ExamplePage } from './routes/example/page.tsx';
import { NotFoundPage } from './routes/not-found.tsx';

/** Wrapper for React Router's errorElement. */
function RouteErrorFallback() {
  const error = useRouteError();
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  return (
    <ErrorFallback
      error={normalizedError}
      resetErrorBoundary={() => globalThis.location.reload()}
    />
  );
}

const router = createBrowserRouter([
  {
    errorElement: <RouteErrorFallback />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/example', element: <ExamplePage /> },
      // Add new routes here.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function RouterProvider() {
  return <RRProvider router={router} />;
}
