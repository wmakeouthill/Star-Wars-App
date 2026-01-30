import { useMemo, useState } from 'react';
import { useStarships } from '../../hooks/useStarships';

export function useStarshipsPage() {
    const [name, setName] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'crew'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);

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

    return {
        name,
        manufacturer,
        sortBy,
        sortOrder,
        page,
        setName,
        setManufacturer,
        setSortBy,
        setSortOrder,
        setPage,
        query,
    };
}
