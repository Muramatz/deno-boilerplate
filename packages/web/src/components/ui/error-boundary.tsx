export { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

/**
 * App-wide fallback UI used by react-error-boundary.
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return (
    <div className='flex min-h-screen items-center justify-center px-6'>
      <div className='w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/10'>
        <h1 className='text-2xl font-semibold text-rose-700'>Something went wrong</h1>
        <p className='mt-2 text-sm text-slate-600'>{message}</p>
        <div className='mt-6 flex flex-wrap gap-3'>
          <button
            type='button'
            className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700'
            onClick={resetErrorBoundary}
          >
            Try again
          </button>
          <button
            type='button'
            className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
            onClick={() => globalThis.location.assign('/')}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
