import { useState } from 'react';
import { useUpdateExample } from '../api/mutations.ts';

export function UpdateForm({ id, onUpdated }: { id: string; onUpdated: () => void }) {
  const [field1, setField1] = useState<boolean | undefined>(undefined);
  const [field2, setField2] = useState('');
  const updateMutation = useUpdateExample();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    if (field1 !== undefined) data.field1 = field1;
    if (field2) data.field2 = field2;
    updateMutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          setField2('');
          setField1(undefined);
          onUpdated();
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-3 rounded border p-4'>
      <h2 className='text-lg font-semibold'>Update Example</h2>
      <div>
        <label className='flex items-center gap-2 text-sm text-gray-600'>
          <input
            type='checkbox'
            checked={field1 ?? false}
            onChange={(e) => setField1(e.target.checked)}
          />
          Field1
        </label>
      </div>
      <div>
        <label className='block text-sm text-gray-600'>Field2</label>
        <input
          type='text'
          value={field2}
          onChange={(e) => setField2(e.target.value)}
          className='w-full rounded border px-3 py-1.5'
          placeholder='New value...'
        />
      </div>
      <button
        type='submit'
        disabled={updateMutation.isPending}
        className='rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50'
      >
        {updateMutation.isPending ? 'Updating...' : 'Update'}
      </button>
      {updateMutation.isError && (
        <p className='text-sm text-red-600'>{updateMutation.error.message}</p>
      )}
    </form>
  );
}
