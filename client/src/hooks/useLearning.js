import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addLearningSession,
  createLearningSubject,
  getLearning,
  getLearningSettings,
  submitLearningExam,
  updateLearningSettings
} from '@/api';

export function useLearning() {
  return useQuery({
    queryKey: ['learning'],
    queryFn: getLearning
  });
}

export function useLearningSettings() {
  return useQuery({
    queryKey: ['learning-settings'],
    queryFn: getLearningSettings
  });
}

export function useCreateLearningSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLearningSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning'] })
  });
}

export function useAddLearningSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, data }) => addLearningSession(subjectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });
}

export function useSubmitLearningExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, data }) => submitLearningExam(subjectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning'] })
  });
}

export function useUpdateLearningSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, updateToken }) => updateLearningSettings(data, updateToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning-settings'] })
  });
}
