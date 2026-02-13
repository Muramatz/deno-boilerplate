import { useState } from 'react';
import { useCreateExample } from '../api/mutations.ts';

export type ExampleData = {
  id: string;
  date: string;
  field1: boolean;
  field2: string;
  createdAt: string;
  updatedAt: string;
};

export function CreateForm({ onCreated }: { onCreated: (data: ExampleData) => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [field1, setField1] = useState(false);
  const [field2, setField2] = useState('');
  const createMutation = useCreateExample();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { date, field1, field2 },
      {
        onSuccess: (data) => {
          onCreated(data as ExampleData);
          setField2('');
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-3 rounded border p-4'>
      <h2 className='text-lg font-semibold'>Create Example</h2>
      <div>
        <label className='block text-sm text-gray-600'>Date</label>
        <input
          type='date'
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className='w-full rounded border px-3 py-1.5'
          required
        />
      </div>
      <div>
        <label className='flex items-center gap-2 text-sm text-gray-600'>
          <input
            type='checkbox'
            checked={field1}
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
          placeholder='Enter text...'
          required
        />
      </div>
      <button
        type='submit'
        disabled={createMutation.isPending}
        className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50'
      >
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>
      {createMutation.isError && (
        <p className='text-sm text-red-600'>{createMutation.error.message}</p>
      )}
    </form>
  );
}
