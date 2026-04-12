import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDietEntry,
  deleteDietEntry,
  getDiet,
  getDietGoals,
  getDietWeek,
  updateDietEntry,
  updateDietGoals
} from '@/api';

export function useDiet(date) {
  return useQuery({
    queryKey: ['diet', date],
    queryFn: () => getDiet(date),
    enabled: Boolean(date)
  });
}

export function useDietWeek(week) {
  return useQuery({
    queryKey: ['diet-week', week],
    queryFn: () => getDietWeek(week),
    enabled: Boolean(week)
  });
}

export function useDietGoals() {
  return useQuery({
    queryKey: ['diet-goals'],
    queryFn: getDietGoals
  });
}

export function useUpdateDietGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDietGoals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet-goals'] });
      queryClient.invalidateQueries({ queryKey: ['diet'] });
      queryClient.invalidateQueries({ queryKey: ['diet-week'] });
    }
  });
}

export function useCreateDietEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDietEntry,
    onSuccess: (_entry, variables) => {
      queryClient.invalidateQueries({ queryKey: ['diet', variables.entry_date] });
      queryClient.invalidateQueries({ queryKey: ['diet-week'] });
    }
  });
}

export function useUpdateDietEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateDietEntry(id, data),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['diet', entry.entry_date] });
      queryClient.invalidateQueries({ queryKey: ['diet-week'] });
    }
  });
}

export function useDeleteDietEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => deleteDietEntry(id),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['diet', variables.entry_date] });
      queryClient.invalidateQueries({ queryKey: ['diet-week'] });
    }
  });
}
