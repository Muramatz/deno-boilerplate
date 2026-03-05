import { useExampleById } from '../api/queries.ts';

export function DetailView({ id }: { id: string }) {
  const { data, isLoading, error } = useExampleById(id);

  if (isLoading) return <p className='text-sm text-slate-500'>Loading...</p>;
  if (error) return <p className='text-sm text-rose-600'>Error: {error.message}</p>;
  if (!data) return null;

  return (
    <dl className='grid gap-x-4 gap-y-2 text-sm md:grid-cols-[120px_1fr]'>
      <dt className='font-medium text-slate-500'>ID</dt>
      <dd className='font-mono text-xs text-slate-700 break-all'>{data.id}</dd>

      <dt className='font-medium text-slate-500'>Date</dt>
      <dd className='text-slate-700'>{data.date}</dd>

      <dt className='font-medium text-slate-500'>Field 1</dt>
      <dd className='text-slate-700'>{String(data.field1)}</dd>

      <dt className='font-medium text-slate-500'>Field 2</dt>
      <dd className='text-slate-700'>{data.field2}</dd>

      <dt className='font-medium text-slate-500'>Created</dt>
      <dd className='text-slate-700'>{data.createdAt}</dd>

      <dt className='font-medium text-slate-500'>Updated</dt>
      <dd className='text-slate-700'>{data.updatedAt}</dd>
    </dl>
  );
}
