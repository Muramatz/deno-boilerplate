import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-6xl font-bold text-gray-300'>404</h1>
        <p className='mt-4 text-xl text-gray-600'>Page not found</p>
        <button
          type='button'
          className='mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
          onClick={() => navigate('/')}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
