import { useMemo, useState } from 'react';
import { useFilms } from '../../hooks/useFilms';
import { useFilmCharacters } from '../../hooks/useFilmCharacters';
import { useFilmDetails } from '../../hooks/useFilmDetails';

export function useFilmsPage() {
    const [title, setTitle] = useState('');
    const [director, setDirector] = useState('');
    const [sortBy, setSortBy] = useState<'title' | 'episode_id'>('episode_id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(8);
    const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
    const [charactersPage, setCharactersPage] = useState(1);
    const [charactersPageSize] = useState(8);

    const filters = useMemo(
        () => ({
            title: title || undefined,
            director: director || undefined,
            sortBy,
            sortOrder,
            page,
            pageSize,
        }),
        [title, director, sortBy, sortOrder, page, pageSize]
    );

    const query = useFilms(filters);
    const charactersQuery = useFilmCharacters(selectedFilmId, charactersPage, charactersPageSize);
    const filmDetailsQuery = useFilmDetails(selectedFilmId);

    return {
        title,
        director,
        sortBy,
        sortOrder,
        page,
        selectedFilmId,
        charactersPage,
        setTitle,
        setDirector,
        setSortBy,
        setSortOrder,
        setPage,
        setSelectedFilmId,
        setCharactersPage,
        query,
        charactersQuery,
        filmDetailsQuery,
    };
}
