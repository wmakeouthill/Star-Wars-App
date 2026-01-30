import { Character } from '../../types/characters.types';
import { formatNumber } from '@/shared/utils/formatters';

export function useCharacterCard(character: Character) {
    return {
        heightLabel: formatNumber(character.height),
        massLabel: formatNumber(character.mass),
    };
}
