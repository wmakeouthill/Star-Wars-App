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
    setName,
    setGender,
    setFilmId,
    setSortBy,
    setSortOrder,
    setPage,
    query,
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
          <CharacterCard key={character.id} character={character} />
        ))}
      </div>

      {query.data?.meta && (
        <Pagination
          page={page}
          totalPages={query.data.meta.total_pages}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
