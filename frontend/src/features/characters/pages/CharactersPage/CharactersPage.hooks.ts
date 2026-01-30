import { useMemo, useState } from 'react';
import { useCharacters } from '../../hooks/useCharacters';
import { useCharacterDetails } from '../../hooks/useCharacterDetails';

export function useCharactersPage() {
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [filmId, setFilmId] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'height' | 'mass'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

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
    const characterDetailsQuery = useCharacterDetails(selectedCharacterId);

    return {
        name,
        gender,
        filmId,
        sortBy,
        sortOrder,
        page,
        selectedCharacterId,
        setName,
        setGender,
        setFilmId,
        setSortBy,
        setSortOrder,
        setPage,
        setSelectedCharacterId,
        query,
        characterDetailsQuery,
    };
}
