import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { readApiErrorMessage } from '@/lib/api-error.ts';
import type { CreateExampleRequest, UpdateExampleRequest } from './types.ts';
import { exampleKeys } from './queries.ts';

export const useCreateExample = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExampleRequest) => {
      const response = await api.api.example.$post({ json: data });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, 'Failed to create record.'));
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
        throw new Error(await readApiErrorMessage(response, 'Failed to update record.'));
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
        throw new Error(await readApiErrorMessage(response, 'Failed to delete record.'));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleKeys.all });
    },
  });
};
