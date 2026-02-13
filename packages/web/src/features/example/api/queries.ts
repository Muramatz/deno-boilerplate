import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const exampleKeys = {
  all: ['example'] as const,
  byId: (id: string) => [...exampleKeys.all, 'id', id] as const,
  byDate: (date: string) => [...exampleKeys.all, 'date', date] as const,
};

export const useExampleById = (id: string) => {
  return useQuery({
    queryKey: exampleKeys.byId(id),
    queryFn: async () => {
      const response = await api.api.example[':id'].$get({ param: { id } });
      if (!response.ok) {
        const errorData = (await response.json()) as { error: { message: string } };
        throw new Error(errorData.error?.message || 'データの取得に失敗しました');
      }
      return response.json();
    },
    enabled: !!id,
  });
};
