export interface Achievement {
  id: string;
  name: string;
  description: string;
  xp_reward: number;
}

export interface AchievementStatus extends Achievement {
  unlocked: boolean;
}

export interface UserGamification {
  user_id: string;
  name?: string | null;
  picture?: string | null;
  total_xp: number;
  jedi_rank: string;
  total_queries: number;
  chat_messages: number;
  achievements: Achievement[];
}

export interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  jedi_rank: string;
  name?: string | null;
  picture?: string | null;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  completed: boolean;
  progress_current?: number | null;
  progress_target?: number | null;
}

// ────────────────────────────────────────────────────────────────────
// Quiz
// ────────────────────────────────────────────────────────────────────

export interface QuizResultCreate {
  score: number;
  correct_answers: number;
  total_questions: number;
  categories: string[];
}

export interface QuizResult {
  id: string;
  user_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  categories: string[];
  xp_earned: number;
  played_at: string;
}

export interface QuizLeaderboardEntry {
  user_id: string;
  best_score: number;
  total_quizzes: number;
  total_correct: number;
  total_questions: number;
  accuracy: number;
  name?: string | null;
  picture?: string | null;
}

