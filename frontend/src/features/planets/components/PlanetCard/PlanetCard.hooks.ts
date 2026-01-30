import { Planet } from '../../types/planets.types';
import { formatSwapiQuantity } from '@/shared/utils/formatters';

export function usePlanetCard(planet: Planet) {
    return {
        populationLabel: formatSwapiQuantity({
            value: planet.population,
            raw: planet.population_raw,
        }),
        surfaceWaterLabel: formatSwapiQuantity({
            value: planet.surface_water ?? null,
            raw: planet.surface_water_raw,
            unit: '%',
        }),
    };
}
