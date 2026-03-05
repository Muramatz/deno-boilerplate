import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { CreateExampleRequest, UpdateExampleRequest } from './types.ts';
import { exampleKeys } from './queries.ts';

export const useCreateExample = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExampleRequest) => {
      const response = await api.api.example.$post({ json: data });
      if (!response.ok) {
        const errorData = (await response.json()) as { error: { message: string } };
        throw new Error(errorData.error?.message || '作成に失敗しました');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleKeys.all });
    },
  });
};

export const useUpdateExample = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExampleRequest }) => {
      const response = await api.api.example[':id'].$patch({
        param: { id },
        json: data,
      });
      if (!response.ok) {
        const errorData = (await response.json()) as { error: { message: string } };
        throw new Error(errorData.error?.message || '更新に失敗しました');
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: exampleKeys.byId(variables.id) });
    },
  });
};

export const useDeleteExample = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.api.example[':id'].$delete({ param: { id } });
      if (!response.ok) {
        const errorData = (await response.json()) as { error: { message: string } };
        throw new Error(errorData.error?.message || '削除に失敗しました');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleKeys.all });
    },
  });
};
