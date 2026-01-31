import { apiGet, apiPost } from '@/shared/services/api';
import {
  AchievementStatus,
  DailyChallenge,
  LeaderboardEntry,
  LeaderboardEntryDetailed,
  QuizHistoryEntry,
  QuizLeaderboardEntry,
  QuizResult,
  QuizResultCreate,
  UserGamification,
} from '../types/gamification.types';

export async function fetchGamificationProfile() {
  return apiGet<UserGamification>('/api/v1/gamification/profile');
}

export async function fetchGamificationLeaderboard(limit = 10) {
  return apiGet<LeaderboardEntry[]>('/api/v1/gamification/leaderboard', { limit });
}

export async function fetchGamificationLeaderboardDetailed(limit = 50) {
  return apiGet<LeaderboardEntryDetailed[]>('/api/v1/gamification/leaderboard-detailed', { limit });
}

export async function fetchGamificationAchievements() {
  return apiGet<AchievementStatus[]>('/api/v1/gamification/achievements');
}

export async function fetchDailyChallenge() {
  return apiGet<DailyChallenge>('/api/v1/gamification/daily-challenge');
}

export interface ChatStatsByPersona {
  yoda_messages: number;
  vader_messages: number;
  total_messages: number;
}

export async function fetchChatStatsByPersona() {
  return apiGet<ChatStatsByPersona>('/api/v1/gamification/chat-stats');
}

// ────────────────────────────────────────────────────────────────────
// Quiz
// ────────────────────────────────────────────────────────────────────

export async function submitQuizResult(payload: QuizResultCreate) {
  return apiPost<QuizResult>('/api/v1/gamification/quiz-result', payload);
}

export async function fetchQuizLeaderboard(limit = 10) {
  return apiGet<QuizLeaderboardEntry[]>('/api/v1/gamification/quiz-leaderboard', { limit });
}

export async function fetchQuizHistory(limit = 20) {
  return apiGet<QuizHistoryEntry[]>('/api/v1/gamification/quiz-history', { limit });
}

