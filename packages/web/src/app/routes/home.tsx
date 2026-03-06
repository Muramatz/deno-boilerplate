import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className='flex min-h-screen items-center justify-center px-6 py-10 md:py-16'>
      <div className='w-full max-w-5xl space-y-6 md:grid md:grid-cols-[1.4fr_1fr] md:gap-6 md:space-y-0'>
        <section className='rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-xl shadow-slate-900/5 backdrop-blur md:p-10'>
          <span className='inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700'>
            Deno + React Starter
          </span>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl'>
            Clean API-first monorepo.
          </h1>
          <p className='mt-4 max-w-2xl text-slate-600'>
            Built with Hono, Prisma, and React Query. Use this workspace as a base and ship features
            quickly.
          </p>
          <nav className='mt-8 flex flex-wrap gap-3'>
            <Link
              to='/example'
              className='inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700'
            >
              Open CRUD Demo
            </Link>
            <a
              href='https://github.com/Muramatz/deno-monorepo-boilerplate'
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
            >
              View Repository
            </a>
          </nav>
        </section>

        <aside className='rounded-3xl border border-slate-200/80 bg-slate-900 p-8 text-slate-100 shadow-xl shadow-slate-900/15'>
          <h2 className='text-lg font-semibold'>What is included</h2>
          <ul className='mt-4 space-y-3 text-sm text-slate-300'>
            <li>Typed API contracts shared between server and client</li>
            <li>React Query cache and mutation patterns</li>
            <li>Prisma-based persistence with test database setup</li>
            <li>GitHub Actions CI/CD and deploy workflow</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
