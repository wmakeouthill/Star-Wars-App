import { VehicleCard } from '../../components/VehicleCard/VehicleCard';
import { Pagination } from '@/shared/components';
import { useVehiclesPage } from './VehiclesPage.hooks';
import styles from './VehiclesPage.module.css';

export function VehiclesPage() {
  const {
    name,
    manufacturer,
    vehicleClass,
    sortBy,
    sortOrder,
    page,
    setName,
    setManufacturer,
    setVehicleClass,
    setSortBy,
    setSortOrder,
    setPage,
    query,
  } = useVehiclesPage();

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
          placeholder="Filtrar por fabricante"
          value={manufacturer}
          onChange={(event) => setManufacturer(event.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Filtrar por classe"
          value={vehicleClass}
          onChange={(event) => setVehicleClass(event.target.value)}
        />
        <select
          className={styles.input}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="name">Ordenar por nome</option>
          <option value="crew">Ordenar por tripulação</option>
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

      {query.isLoading && <p className={styles.status}>Carregando veículos...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar veículos.</p>}

      <div className={styles.grid}>
        {query.data?.items.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
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

