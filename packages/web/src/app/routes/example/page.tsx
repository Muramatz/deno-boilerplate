import { useState } from 'react';
import {
  CreateForm,
  DeleteButton,
  DetailView,
  type ExampleData,
  UpdateForm,
} from '@/features/example/index.ts';

/**
 * Example CRUD ページ — features/example のコンポーネントを合成するだけ
 */
export function ExamplePage() {
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreated = (data: ExampleData) => {
    setCreatedIds((prev) => [data.id, ...prev]);
    setSelectedId(data.id);
    showMessage(`Created: ${data.id}`);
  };

  const handleDeleted = () => {
    showMessage(`Deleted: ${selectedId}`);
    setCreatedIds((prev) => prev.filter((i) => i !== selectedId));
    setSelectedId(createdIds.find((i) => i !== selectedId) ?? null);
  };

  return (
    <div className='mx-auto max-w-2xl p-6'>
      <h1 className='mb-6 text-3xl font-bold'>Example CRUD</h1>

      <p className='mb-6 text-gray-600'>
        All 4 backend API operations: POST (create), GET (read), PATCH (update), DELETE.
      </p>

      {message && (
        <div className='mb-4 rounded bg-green-100 px-4 py-2 text-green-800'>{message}</div>
      )}

      <section className='mb-6'>
        <CreateForm onCreated={handleCreated} />
      </section>

      {createdIds.length > 0 && (
        <section className='mb-6'>
          <h2 className='mb-2 text-lg font-semibold'>Created Items</h2>
          <div className='flex flex-wrap gap-2'>
            {createdIds.map((id) => (
              <button
                type='button'
                key={id}
                onClick={() => setSelectedId(id)}
                className={`rounded px-3 py-1 text-sm ${
                  selectedId === id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {id.slice(0, 8)}...
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedId && (
        <section className='space-y-4'>
          <div className='rounded border p-4'>
            <h2 className='mb-2 text-lg font-semibold'>Detail (GET)</h2>
            <DetailView id={selectedId} />
          </div>

          <UpdateForm
            id={selectedId}
            onUpdated={() => showMessage(`Updated: ${selectedId}`)}
          />

          <div className='flex items-center gap-4'>
            <DeleteButton id={selectedId} onDeleted={handleDeleted} />
          </div>
        </section>
      )}
    </div>
  );
}
