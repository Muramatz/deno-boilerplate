export { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

/**
 * ルーター・アプリ全体用のフォールバックUI
 * react-error-boundary の FallbackComponent として使用
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
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold text-red-600'>Something went wrong</h1>
        <p className='mt-2 text-gray-600'>{message}</p>
        <div className='mt-4 flex justify-center gap-3'>
          <button
            type='button'
            className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
            onClick={resetErrorBoundary}
          >
            Try again
          </button>
          <button
            type='button'
            className='rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300'
            onClick={() => globalThis.location.assign('/')}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
