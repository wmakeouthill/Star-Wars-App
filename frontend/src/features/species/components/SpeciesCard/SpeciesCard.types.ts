import { Species } from '../../types/species.types';

export interface SpeciesCardProps {
    species: Species;
    variant?: 'full' | 'compact';
    onViewDetails?: () => void;
}

