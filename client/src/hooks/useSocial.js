import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createChallenge, getChallenges, getLeaderboard, updateChallenge } from '@/api';

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: ['challenges'],
    queryFn: getChallenges
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] })
  });
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateChallenge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });
}
