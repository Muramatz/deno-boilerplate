import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateExampleSchema } from '@app/api/schemas';
import type { z } from 'zod';
import { useUpdateExample } from '../api/mutations.ts';

type UpdateExampleInput = z.input<typeof updateExampleSchema>;

export function UpdateForm({ id, onUpdated }: { id: string; onUpdated: () => void }) {
  const updateMutation = useUpdateExample();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateExampleInput>({
    resolver: zodResolver(updateExampleSchema),
    defaultValues: { field1: undefined, field2: undefined },
  });

  const field1Value = watch('field1');

  const onSubmit = (data: UpdateExampleInput) => {
    // undefined のフィールドを除去
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined && v !== ''),
    );
    updateMutation.mutate(
      { id, data: filtered },
      {
        onSuccess: () => {
          reset();
          onUpdated();
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-3 rounded border p-4'>
      <h2 className='text-lg font-semibold'>Update Example</h2>
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
          placeholder='New value...'
        />
        {errors.field2 && <p className='mt-1 text-sm text-red-600'>{errors.field2.message}</p>}
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
