import { apiGet } from '@/shared/services/api';
import {
  AchievementStatus,
  DailyChallenge,
  LeaderboardEntry,
  UserGamification,
} from '../types/gamification.types';

export async function fetchGamificationProfile() {
  return apiGet<UserGamification>('/api/v1/gamification/profile');
}

export async function fetchGamificationLeaderboard(limit = 10) {
  return apiGet<LeaderboardEntry[]>('/api/v1/gamification/leaderboard', { limit });
}

export async function fetchGamificationAchievements() {
  return apiGet<AchievementStatus[]>('/api/v1/gamification/achievements');
}

export async function fetchDailyChallenge() {
  return apiGet<DailyChallenge>('/api/v1/gamification/daily-challenge');
}

