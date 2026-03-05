import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className='flex min-h-screen items-center justify-center px-6'>
      <div className='w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/10'>
        <h1 className='text-6xl font-semibold text-slate-300'>404</h1>
        <p className='mt-4 text-xl font-medium text-slate-800'>Page not found</p>
        <p className='mt-2 text-sm text-slate-500'>
          The page may have moved or the URL may be incorrect.
        </p>
        <button
          type='button'
          className='mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700'
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
