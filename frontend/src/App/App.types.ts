export type AppSection =
  | 'dashboard'
  | 'reports'
  | 'characters'
  | 'planets'
  | 'starships'
  | 'vehicles'
  | 'species'
  | 'films'
  | 'gamification';

export interface AppNavigationItem {
    id: AppSection;
    label: string;
}
