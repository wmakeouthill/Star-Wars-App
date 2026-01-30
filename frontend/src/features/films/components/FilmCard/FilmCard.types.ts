import { Film } from '../../types/films.types';

export interface FilmCardProps {
    film: Film & { image_url?: string | null };
    onSelect?: (filmId: string) => void;
    isSelected?: boolean;
    variant?: 'full' | 'compact';
    onViewDetails?: () => void;
}
