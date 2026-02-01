import { useMemo, useState } from 'react';
import { useStarships } from '../../hooks/useStarships';
import { useStarshipDetails } from '../../hooks/useStarshipDetails';

export function useStarshipsPage() {
    const [name, setName] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [starshipClass, setStarshipClass] = useState('');
    const [filmId, setFilmId] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'crew'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const [selectedStarshipId, setSelectedStarshipId] = useState<string | null>(null);

    const filters = useMemo(
        () => ({
            name: name || undefined,
            manufacturer: manufacturer || undefined,
            starshipClass: starshipClass || undefined,
            filmId: filmId || undefined,
            sortBy,
            sortOrder,
            page,
            pageSize,
        }),
        [name, manufacturer, starshipClass, filmId, sortBy, sortOrder, page, pageSize]
    );

    const query = useStarships(filters);
    const starshipDetailsQuery = useStarshipDetails(selectedStarshipId);

    return {
        name,
        manufacturer,
        starshipClass,
        filmId,
        sortBy,
        sortOrder,
        page,
        selectedStarshipId,
        setName,
        setManufacturer,
        setStarshipClass,
        setFilmId,
        setSortBy,
        setSortOrder,
        setPage,
        setSelectedStarshipId,
        query,
        starshipDetailsQuery,
    };
}
