import { Planet } from '../../types/planets.types';
import { formatNumber } from '@/shared/utils/formatters';

export function usePlanetCard(planet: Planet) {
    return {
        populationLabel: formatNumber(planet.population),
    };
}
