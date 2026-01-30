import { useState } from 'react';
import { AppSection, AppNavigationItem } from './App.types';

const navigationItems: AppNavigationItem[] = [
    { id: 'dashboard', label: 'Central' },
    { id: 'reports', label: 'Relatórios' },
    { id: 'characters', label: 'Personagens' },
    { id: 'planets', label: 'Planetas' },
    { id: 'starships', label: 'Naves' },
    { id: 'vehicles', label: 'Veículos' },
    { id: 'species', label: 'Espécies' },
    { id: 'films', label: 'Filmes' },
    { id: 'chat', label: 'Mestre Yoda (Tela)' },
    { id: 'gamification', label: 'Gamificação' },
];

export function useAppNavigation() {
    const [activeSection, setActiveSection] = useState<AppSection>('dashboard');

    return {
        activeSection,
        navigationItems,
        setActiveSection,
    };
}
