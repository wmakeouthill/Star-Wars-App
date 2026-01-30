import { Character } from '../../types/characters.types';
import { formatSwapiQuantity } from '@/shared/utils/formatters';

export function useCharacterCard(character: Character) {
    return {
        heightLabel: formatSwapiQuantity({
            value: character.height,
            raw: character.height_raw,
            min: character.height_min ?? null,
            max: character.height_max ?? null,
            unit: 'cm',
        }),
        massLabel: formatSwapiQuantity({
            value: character.mass,
            raw: character.mass_raw,
            min: character.mass_min ?? null,
            max: character.mass_max ?? null,
            unit: 'kg',
        }),
    };
}
