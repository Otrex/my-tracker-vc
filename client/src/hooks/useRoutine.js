import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRoutine, getWeeks, updateRoutine } from '@/api';

export function useRoutine(week) {
  return useQuery({
    queryKey: ['routine', week],
    queryFn: () => getRoutine(week),
    enabled: Boolean(week)
  });
}

export function useWeeks() {
  return useQuery({
    queryKey: ['weeks'],
    queryFn: getWeeks
  });
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, updateToken }) => updateRoutine(id, data, updateToken),
    onMutate: async ({ id, week, data }) => {
      await queryClient.cancelQueries({ queryKey: ['routine', week] });
      const previous = queryClient.getQueryData(['routine', week]);

      queryClient.setQueryData(['routine', week], (current = []) =>
        current.map((row) => (row.id === id ? { ...row, ...data } : row))
      );

      return { previous, week };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['routine', context.week], context.previous);
      }
    },
    onSuccess: (updatedRow, variables) => {
      queryClient.setQueryData(['routine', variables.week], (current = []) =>
        current.map((row) => (row.id === updatedRow.id ? updatedRow : row))
      );
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
    }
  });
}
