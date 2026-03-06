import { useDeleteExample } from '../api/mutations.ts';

export function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const deleteMutation = useDeleteExample();

  return (
    <button
      type='button'
      onClick={() => deleteMutation.mutate(id, { onSuccess: onDeleted })}
      disabled={deleteMutation.isPending}
      className='rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50'
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
