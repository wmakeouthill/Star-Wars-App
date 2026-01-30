import { useQuery } from '@tanstack/react-query';
import {
  fetchDailyChallenge,
  fetchGamificationAchievements,
  fetchGamificationLeaderboard,
  fetchGamificationProfile,
} from '../services/gamification.service';

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

