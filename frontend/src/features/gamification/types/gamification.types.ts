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

