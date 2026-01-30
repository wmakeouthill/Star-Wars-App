import { useMemo, useState } from 'react';
import { useCharacters } from '../../hooks/useCharacters';

export function useCharactersPage() {
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [filmId, setFilmId] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'height' | 'mass'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);

    const filters = useMemo(
        () => ({
            name: name || undefined,
            gender: gender || undefined,
            filmId: filmId || undefined,
            sortBy,
            sortOrder,
            page,
            pageSize,
        }),
        [name, gender, filmId, sortBy, sortOrder, page, pageSize]
    );

    const query = useCharacters(filters);

    return {
        name,
        gender,
        filmId,
        sortBy,
        sortOrder,
        page,
        setName,
        setGender,
        setFilmId,
        setSortBy,
        setSortOrder,
        setPage,
        query,
    };
}
