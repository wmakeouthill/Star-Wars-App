import { Species } from '../../types/species.types';
import { formatSwapiQuantity } from '@/shared/utils/formatters';

export function useSpeciesCard(species: Species) {
    return {
        heightLabel: formatSwapiQuantity({
            value: species.average_height,
            raw: species.average_height_raw,
            unit: 'cm',
        }),
        lifespanLabel: formatSwapiQuantity({
            value: species.average_lifespan,
            raw: species.average_lifespan_raw,
            unit: 'anos',
        }),
    };
}

