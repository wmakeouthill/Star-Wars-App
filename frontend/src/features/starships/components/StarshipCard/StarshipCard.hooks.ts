import { Starship } from '../../types/starships.types';
import { formatNumber } from '@/shared/utils/formatters';

export function useStarshipCard(starship: Starship) {
    return {
        crewLabel: formatNumber(starship.crew),
        passengersLabel: formatNumber(starship.passengers),
    };
}
