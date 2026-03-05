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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm'
    >
      <h2 className='text-lg font-semibold text-slate-900'>Create Record</h2>
      <div>
        <label className='mb-1 block text-sm font-medium text-slate-700'>Date</label>
        <input
          type='date'
          {...register('date')}
          className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-sky-500'
        />
        {errors.date && <p className='mt-1 text-sm text-rose-600'>{errors.date.message}</p>}
      </div>
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
          {...register('field2')}
          className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-sky-500'
          placeholder='Enter text...'
        />
        {errors.field2 && <p className='mt-1 text-sm text-rose-600'>{errors.field2.message}</p>}
      </div>
      <button
        type='submit'
        disabled={createMutation.isPending}
        className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>
      {createMutation.isError && (
        <p className='text-sm text-rose-600'>{createMutation.error.message}</p>
      )}
    </form>
  );
}
