import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-4xl font-bold text-brand-primary'>My App</h1>
        <p className='mt-4 text-gray-600'>Welcome to My App</p>
        <nav className='mt-6'>
          <Link to='/example' className='text-blue-600 underline hover:text-blue-800'>
            Example CRUD Demo
          </Link>
        </nav>
      </div>
    </div>
  );
}
