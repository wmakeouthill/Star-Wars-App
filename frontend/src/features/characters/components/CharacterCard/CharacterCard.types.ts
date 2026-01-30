import { Character } from '../../types/characters.types';

export interface CharacterCardProps {
    character: Character;
    onSelect?: (characterId: string) => void;
    isSelected?: boolean;
    variant?: 'full' | 'compact';
    onViewDetails?: () => void;
}
