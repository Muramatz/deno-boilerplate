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
    // Remove undefined/empty fields to send partial updates only.
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm'
    >
      <h2 className='text-lg font-semibold text-slate-900'>Update Record</h2>
      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-slate-700'>
          <input
            type='checkbox'
            checked={field1Value ?? false}
            onChange={(e) => setValue('field1', e.target.checked)}
            className='h-4 w-4 rounded border-slate-300 text-sky-600'
          />
          Field 1
        </label>
      </div>
      <div>
        <label className='mb-1 block text-sm font-medium text-slate-700'>Field 2</label>
        <input
          type='text'
          {...register('field2', {
            setValueAs: (value) => {
              if (typeof value !== 'string') return value;
              const trimmed = value.trim();
              return trimmed === '' ? undefined : trimmed;
            },
          })}
          className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-sky-500'
          placeholder='New value...'
        />
        {errors.field2 && <p className='mt-1 text-sm text-rose-600'>{errors.field2.message}</p>}
      </div>
      <button
        type='submit'
        disabled={updateMutation.isPending}
        className='rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {updateMutation.isPending ? 'Updating...' : 'Update'}
      </button>
      {updateMutation.isError && (
        <p className='text-sm text-rose-600'>{updateMutation.error.message}</p>
      )}
    </form>
  );
}
