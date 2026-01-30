import { useMemo, useState } from 'react';
import { usePlanets } from '../../hooks/usePlanets';
import { usePlanetDetails } from '../../hooks/usePlanetDetails';

export function usePlanetsPage() {
    const [name, setName] = useState('');
    const [climate, setClimate] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'population'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);

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
    const planetDetailsQuery = usePlanetDetails(selectedPlanetId);

    return {
        name,
        climate,
        sortBy,
        sortOrder,
        page,
        selectedPlanetId,
        setName,
        setClimate,
        setSortBy,
        setSortOrder,
        setPage,
        setSelectedPlanetId,
        query,
        planetDetailsQuery,
    };
}
