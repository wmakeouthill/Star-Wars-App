import { useMemo, useState } from 'react';
import { useStarships } from '../../hooks/useStarships';
import { useStarshipDetails } from '../../hooks/useStarshipDetails';

export function useStarshipsPage() {
    const [name, setName] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'crew'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const [selectedStarshipId, setSelectedStarshipId] = useState<string | null>(null);

    const filters = useMemo(
        () => ({
            name: name || undefined,
            manufacturer: manufacturer || undefined,
            sortBy,
            sortOrder,
            page,
            pageSize,
        }),
        [name, manufacturer, sortBy, sortOrder, page, pageSize]
    );

    const query = useStarships(filters);
    const starshipDetailsQuery = useStarshipDetails(selectedStarshipId);

    return {
        name,
        manufacturer,
        sortBy,
        sortOrder,
        page,
        selectedStarshipId,
        setName,
        setManufacturer,
        setSortBy,
        setSortOrder,
        setPage,
        setSelectedStarshipId,
        query,
        starshipDetailsQuery,
    };
}
