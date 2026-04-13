import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptGameMatch,
  createChallenge,
  createGameMatch,
  getChallenges,
  getGameMatches,
  getLeaderboard,
  submitGameScore,
  updateChallenge
} from '@/api';

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

export function useGameMatches() {
  return useQuery({
    queryKey: ['game-matches'],
    queryFn: getGameMatches
  });
}

export function useCreateGameMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGameMatch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game-matches'] })
  });
}

export function useAcceptGameMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptGameMatch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game-matches'] })
  });
}

export function useSubmitGameScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, score }) => submitGameScore(id, score),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-matches'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });
}
