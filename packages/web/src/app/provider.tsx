import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary, ErrorFallback } from '@/components/ui/error-boundary.tsx';
import { createQueryClient } from '@/lib/query-client.ts';
import { RouterProvider } from './router.tsx';

const queryClient = createQueryClient();

export function AppProvider() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        console.error('App ErrorBoundary:', error, info.componentStack);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
