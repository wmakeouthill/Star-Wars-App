import { useMemo, useState } from 'react';
import { useSpecies } from '../../hooks/useSpecies';

export function useSpeciesPage() {
  const [name, setName] = useState('');
  const [classification, setClassification] = useState('');
  const [language, setLanguage] = useState('');
  const [filmId, setFilmId] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'average_height'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const filters = useMemo(
    () => ({
      name: name || undefined,
      classification: classification || undefined,
      language: language || undefined,
      filmId: filmId || undefined,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
    [name, classification, language, filmId, sortBy, sortOrder, page, pageSize]
  );

  const query = useSpecies(filters);

  return {
    name,
    classification,
    language,
    filmId,
    sortBy,
    sortOrder,
    page,
    setName,
    setClassification,
    setLanguage,
    setFilmId,
    setSortBy,
    setSortOrder,
    setPage,
    query,
  };
}

