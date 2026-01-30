import { Planet } from '../../types/planets.types';

export interface PlanetCardProps {
    planet: Planet;
    onSelect?: (planetId: string) => void;
    isSelected?: boolean;
    variant?: 'full' | 'compact';
    onViewDetails?: () => void;
}
