import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExampleSchema } from '@app/api/schemas';
import type { z } from 'zod';
import { useCreateExample } from '../api/mutations.ts';

type CreateExampleInput = z.input<typeof createExampleSchema>;

export type ExampleData = {
  id: string;
  date: string;
  field1: boolean;
  field2: string;
  createdAt: string;
  updatedAt: string;
};

function todayString(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function CreateForm({ onCreated }: { onCreated: (data: ExampleData) => void }) {
  const createMutation = useCreateExample();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateExampleInput>({
    resolver: zodResolver(createExampleSchema),
    defaultValues: { date: todayString(), field1: false, field2: '' },
  });

  const field1Value = watch('field1');

  const onSubmit = (data: CreateExampleInput) => {
    createMutation.mutate(data, {
      onSuccess: (res) => {
        onCreated(res as ExampleData);
        reset({ date: todayString(), field1: false, field2: '' });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-3 rounded border p-4'>
      <h2 className='text-lg font-semibold'>Create Example</h2>
      <div>
        <label className='block text-sm text-gray-600'>Date</label>
        <input
          type='date'
          {...register('date')}
          className='w-full rounded border px-3 py-1.5'
        />
        {errors.date && <p className='mt-1 text-sm text-red-600'>{errors.date.message}</p>}
      </div>
      <div>
        <label className='flex items-center gap-2 text-sm text-gray-600'>
          <input
            type='checkbox'
            checked={field1Value ?? false}
            onChange={(e) => setValue('field1', e.target.checked)}
          />
          Field1
        </label>
      </div>
      <div>
        <label className='block text-sm text-gray-600'>Field2</label>
        <input
          type='text'
          {...register('field2')}
          className='w-full rounded border px-3 py-1.5'
          placeholder='Enter text...'
        />
        {errors.field2 && <p className='mt-1 text-sm text-red-600'>{errors.field2.message}</p>}
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
