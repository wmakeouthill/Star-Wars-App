import { useMemo, useState } from 'react';
import { usePlanets } from '../../hooks/usePlanets';

export function usePlanetsPage() {
    const [name, setName] = useState('');
    const [climate, setClimate] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'population'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);

    const filters = useMemo(
        () => ({
            name: name || undefined,
            climate: climate || undefined,
            sortBy,
            sortOrder,
            page,
            pageSize,
        }),
        [name, climate, sortBy, sortOrder, page, pageSize]
    );

    const query = usePlanets(filters);

    return {
        name,
        climate,
        sortBy,
        sortOrder,
        page,
        setName,
        setClimate,
        setSortBy,
        setSortOrder,
        setPage,
        query,
    };
}
