import { Starship } from '../../types/starships.types';

export interface StarshipCardProps {
    starship: Starship;
    onSelect?: (starshipId: string) => void;
    isSelected?: boolean;
    variant?: 'full' | 'compact';
    onViewDetails?: () => void;
}
