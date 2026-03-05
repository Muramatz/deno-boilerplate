import { useDeleteExample } from '../api/mutations.ts';

export function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const deleteMutation = useDeleteExample();

  return (
    <button
      type='button'
      onClick={() => deleteMutation.mutate(id, { onSuccess: onDeleted })}
      disabled={deleteMutation.isPending}
      className='rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50'
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
