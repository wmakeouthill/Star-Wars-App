import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDailyChallenge,
  fetchGamificationAchievements,
  fetchGamificationLeaderboard,
  fetchGamificationProfile,
  fetchQuizLeaderboard,
  submitQuizResult,
} from '../services/gamification.service';
import type { QuizResultCreate } from '../types/gamification.types';

export function useGamificationProfile() {
  return useQuery({
    queryKey: ['gamification', 'profile'],
    queryFn: fetchGamificationProfile,
  });
}

export function useGamificationLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['gamification', 'leaderboard', limit],
    queryFn: () => fetchGamificationLeaderboard(limit),
  });
}

export function useGamificationAchievements() {
  return useQuery({
    queryKey: ['gamification', 'achievements'],
    queryFn: fetchGamificationAchievements,
  });
}

export function useDailyChallenge() {
  return useQuery({
    queryKey: ['gamification', 'daily-challenge'],
    queryFn: fetchDailyChallenge,
  });
}

// ────────────────────────────────────────────────────────────────────
// Quiz
// ────────────────────────────────────────────────────────────────────

export function useQuizLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['gamification', 'quiz-leaderboard', limit],
    queryFn: () => fetchQuizLeaderboard(limit),
  });
}

export function useSubmitQuizResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuizResultCreate) => submitQuizResult(payload),
    onSuccess: () => {
      // Invalida leaderboard e profile pra refletir novo XP
      queryClient.invalidateQueries({ queryKey: ['gamification', 'quiz-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'leaderboard'] });
    },
  });
}

