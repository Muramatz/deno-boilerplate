import { useExampleById } from '../api/queries.ts';

export function DetailView({ id }: { id: string }) {
  const { data, isLoading, error } = useExampleById(id);

  if (isLoading) return <p className='text-gray-500'>Loading...</p>;
  if (error) return <p className='text-red-600'>Error: {error.message}</p>;
  if (!data) return null;

  return (
    <div className='space-y-1 text-sm'>
      <p>
        <span className='text-gray-500'>ID:</span> {data.id}
      </p>
      <p>
        <span className='text-gray-500'>Date:</span> {data.date}
      </p>
      <p>
        <span className='text-gray-500'>Field1:</span> {String(data.field1)}
      </p>
      <p>
        <span className='text-gray-500'>Field2:</span> {data.field2}
      </p>
      <p>
        <span className='text-gray-500'>Created:</span> {data.createdAt}
      </p>
      <p>
        <span className='text-gray-500'>Updated:</span> {data.updatedAt}
      </p>
    </div>
  );
}
