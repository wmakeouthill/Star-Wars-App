import { useEffect, useMemo, useRef, useState } from 'react';
import { CharacterCard } from '../../components/CharacterCard';
import { DetailsModal, Pagination, CustomSelect, FilmFilter } from '@/shared/components';
import { useGenderOptions } from '@/shared/hooks/useMetadataOptions';
import { useCharactersPage } from './CharactersPage.hooks';
import styles from './CharactersPage.module.css';

const CARD_MIN_WIDTH = 260;
const CARD_GAP = 16; // 1rem
const ROWS_PER_PAGE = 3; // Número de linhas desejadas por página

export function CharactersPage() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);

  // Calcula quantas colunas cabem no grid
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const computeCols = (width: number) => {
      const columns = Math.floor((width + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP));
      return Math.max(1, columns);
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setCols(computeCols(entry.contentRect.width));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // pageSize = colunas * linhas desejadas
  const pageSize = cols * ROWS_PER_PAGE;

  const {
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
  } = useCharactersPage(pageSize);

  const [detailsTitle, setDetailsTitle] = useState('');
  const { options: genderOptions } = useGenderOptions();

  const summaryCharacter = useMemo(() => {
    if (!selectedCharacterId) return null;
    return query.data?.items.find((c) => c.id === selectedCharacterId) ?? null;
  }, [query.data?.items, selectedCharacterId]);

  return (
    <section>
      <div className={styles.filters}>
        <input
          className={styles.input}
          placeholder="Filtrar por nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        
        <CustomSelect
          value={gender}
          onChange={(value) => setGender(value as string)}
          options={genderOptions}
          placeholder="Filtrar por gênero"
          className={styles.input}
        />

        <FilmFilter
          value={filmId}
          onChange={setFilmId}
          className={styles.input}
        />

        <CustomSelect
          value={sortBy}
          onChange={(value) => setSortBy(value as typeof sortBy)}
          options={[
            { value: 'name', label: 'Ordenar por nome' },
            { value: 'height', label: 'Ordenar por altura' },
            { value: 'mass', label: 'Ordenar por massa' },
          ]}
          placeholder="Ordenar por"
        />
        <CustomSelect
          value={sortOrder}
          onChange={(value) => setSortOrder(value as typeof sortOrder)}
          options={[
            { value: 'asc', label: 'Ascendente' },
            { value: 'desc', label: 'Descendente' },
          ]}
          placeholder="Ordem"
        />
      </div>

      {query.isLoading && <p className={styles.status}>Carregando personagens...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar personagens.</p>}

      <div ref={gridRef} className={styles.grid}>
        {query.data?.items.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            variant="compact"
            onViewDetails={() => {
              setSelectedCharacterId(character.id);
              setDetailsTitle(character.name);
            }}
          />
        ))}
      </div>

      {query.data?.meta && (
        <Pagination
          page={page}
          totalPages={query.data.meta.total_pages}
          onPageChange={setPage}
        />
      )}

      <DetailsModal
        open={!!selectedCharacterId}
        title={detailsTitle || summaryCharacter?.name || 'Personagem'}
        onClose={() => {
          setSelectedCharacterId(null);
          setDetailsTitle('');
        }}
      >
        {characterDetailsQuery.isLoading && (
          <p className={styles.status}>Carregando detalhes do personagem...</p>
        )}
        {characterDetailsQuery.isError && (
          <p className={styles.status}>Erro ao carregar detalhes do personagem.</p>
        )}

        {(characterDetailsQuery.data || summaryCharacter) && (
          <>
            <CharacterCard character={characterDetailsQuery.data ?? summaryCharacter!} />
            {characterDetailsQuery.data && (
              <>
                {characterDetailsQuery.data.homeworld?.name && (
                  <p className={styles.status}>
                    <strong>Planeta natal:</strong> {characterDetailsQuery.data.homeworld.name}
                  </p>
                )}
                <p className={styles.status}>
                  <strong>Filmes:</strong>{' '}
                  {(characterDetailsQuery.data.films ?? []).map((f) => f.title).join(', ') || '—'}
                </p>
                <p className={styles.status}>
                  <strong>Espécies:</strong>{' '}
                  {(characterDetailsQuery.data.species ?? []).map((s) => s.name).join(', ') || '—'}
                </p>
                <p className={styles.status}>
                  <strong>Veículos:</strong>{' '}
                  {(characterDetailsQuery.data.vehicles ?? []).map((v) => v.name).join(', ') || '—'}
                </p>
                <p className={styles.status}>
                  <strong>Naves:</strong>{' '}
                  {(characterDetailsQuery.data.starships ?? []).map((s) => s.name).join(', ') || '—'}
                </p>
              </>
            )}
          </>
        )}
      </DetailsModal>
    </section>
  );
}
