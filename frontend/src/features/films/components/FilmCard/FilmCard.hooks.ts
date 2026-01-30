import { Film } from '../../types/films.types';

export function useFilmCard(film: Film) {
    return {
        releaseDate: new Date(film.release_date).toLocaleDateString('pt-BR'),
    };
}
