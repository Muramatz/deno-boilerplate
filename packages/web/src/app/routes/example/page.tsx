import { useEffect, useMemo, useState } from 'react';
import {
  CreateForm,
  DeleteButton,
  DetailView,
  type ExampleData,
  UpdateForm,
  useExampleList,
} from '@/features/example/index.ts';

/**
 * Example CRUD page that composes components from features/example.
 */
export function ExamplePage() {
  const { data: records, isLoading: isListLoading, error: listError } = useExampleList();
  const recordIds = useMemo(() => (records ?? []).map((record) => record.id), [records]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (recordIds.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !recordIds.includes(selectedId)) {
      setSelectedId(recordIds[0]!);
    }
  }, [recordIds, selectedId]);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreated = (data: ExampleData) => {
    setSelectedId(data.id);
    showMessage(`Created: ${data.id}`);
  };

  const handleDeleted = () => {
    if (!selectedId) return;
    showMessage(`Deleted: ${selectedId}`);
    setSelectedId(null);
  };

  return (
    <main className='flex min-h-screen items-center justify-center px-6 py-10'>
      <div className='w-full max-w-4xl'>
        <header className='rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur md:p-8'>
          <h1 className='text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl'>
            Example CRUD
          </h1>
          <p className='mt-3 text-slate-600'>
            This page exercises all API operations: POST, GET, PATCH, and DELETE.
          </p>
        </header>

        {message && (
          <div className='mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800'>
            {message}
          </div>
        )}

        <section className='mt-6'>
          <CreateForm onCreated={handleCreated} />
        </section>

        <section className='mt-6 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm'>
          <h2 className='mb-3 text-lg font-semibold text-slate-900'>Created Items</h2>
          {isListLoading && <p className='text-sm text-slate-500'>Loading records...</p>}
          {listError && <p className='text-sm text-rose-600'>Error: {listError.message}</p>}
          {!isListLoading && !listError && recordIds.length === 0 && (
            <p className='text-sm text-slate-500'>No records yet. Create your first one above.</p>
          )}
          <div className='flex flex-wrap gap-2'>
            {recordIds.map((id) => (
              <button
                type='button'
                key={id}
                onClick={() => setSelectedId(id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  selectedId === id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {id.slice(0, 8)}...
              </button>
            ))}
          </div>
        </section>

        {selectedId && (
          <section className='mt-6 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm'>
            <h2 className='mb-3 text-lg font-semibold text-slate-900'>Detail (GET)</h2>
            <DetailView id={selectedId} />
          </section>
        )}

        {selectedId && (
          <section className='mt-6 space-y-4'>
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
    </main>
  );
}
