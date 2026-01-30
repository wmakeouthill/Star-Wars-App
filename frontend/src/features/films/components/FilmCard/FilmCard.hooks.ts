import { Film } from '../../types/films.types';

export function useFilmCard(film: Film) {
    const crawl = (film.opening_crawl ?? '').trim();
    const openingCrawlPreview =
        crawl.length > 140 ? `${crawl.slice(0, 139)}…` : crawl;

    return {
        releaseDate: new Date(film.release_date).toLocaleDateString('pt-BR'),
        openingCrawlPreview,
    };
}
