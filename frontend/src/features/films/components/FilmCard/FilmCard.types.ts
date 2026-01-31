import { Film } from '../../types/films.types';

export interface FilmCardProps {
    film: Film;
    onSelect?: (filmId: string) => void;
    isSelected?: boolean;
    variant?: 'full' | 'compact';
    onViewDetails?: () => void;
}
