import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { readApiErrorMessage } from '@/lib/api-error.ts';

export const exampleKeys = {
  all: ['example'] as const,
  list: () => [...exampleKeys.all, 'list'] as const,
  byId: (id: string) => [...exampleKeys.all, 'id', id] as const,
  byDate: (date: string) => [...exampleKeys.all, 'date', date] as const,
};

export const useExampleList = () => {
  return useQuery({
    queryKey: exampleKeys.list(),
    queryFn: async () => {
      const response = await api.api.example.$get();
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, 'Failed to fetch records.'));
      }
      return response.json();
    },
  });
};

export const useExampleById = (id: string) => {
  return useQuery({
    queryKey: exampleKeys.byId(id),
    queryFn: async () => {
      const response = await api.api.example[':id'].$get({ param: { id } });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, 'Failed to fetch record.'));
      }
      return response.json();
    },
    enabled: !!id,
  });
};
