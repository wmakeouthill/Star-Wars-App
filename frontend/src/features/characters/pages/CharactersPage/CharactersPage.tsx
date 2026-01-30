import { CharacterCard } from '../../components/CharacterCard';
import { Pagination } from '@/shared/components';
import { useCharactersPage } from './CharactersPage.hooks';
import styles from './CharactersPage.module.css';

export function CharactersPage() {
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
  } = useCharactersPage();

  return (
    <section>
      <div className={styles.filters}>
        <input
          className={styles.input}
          placeholder="Filtrar por nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Filtrar por gênero"
          value={gender}
          onChange={(event) => setGender(event.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Filme ID"
          value={filmId}
          onChange={(event) => setFilmId(event.target.value)}
        />
        <select
          className={styles.input}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="name">Ordenar por nome</option>
          <option value="height">Ordenar por altura</option>
          <option value="mass">Ordenar por massa</option>
        </select>
        <select
          className={styles.input}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
        >
          <option value="asc">Ascendente</option>
          <option value="desc">Descendente</option>
        </select>
      </div>

      {query.isLoading && <p className={styles.status}>Carregando personagens...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar personagens.</p>}

      <div className={styles.grid}>
        {query.data?.items.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            isSelected={selectedCharacterId === character.id}
            onSelect={(characterId) => setSelectedCharacterId(characterId)}
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

      {selectedCharacterId && (
        <section className={styles.charactersSection}>
          <h3 className={styles.sectionTitle}>Detalhes do personagem selecionado</h3>
          {characterDetailsQuery.isLoading && (
            <p className={styles.status}>Carregando detalhes do personagem...</p>
          )}
          {characterDetailsQuery.isError && (
            <p className={styles.status}>Erro ao carregar detalhes do personagem.</p>
          )}
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
        </section>
      )}
    </section>
  );
}
