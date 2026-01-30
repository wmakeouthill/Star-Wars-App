export type AppSection =
  | 'dashboard'
  | 'reports'
  | 'characters'
  | 'planets'
  | 'starships'
  | 'films'
  | 'chat'
  | 'gamification';

export interface AppNavigationItem {
    id: AppSection;
    label: string;
}
