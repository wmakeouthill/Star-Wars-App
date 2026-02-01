import { useMemo, useState } from 'react';
import { VehicleCard } from '../../components/VehicleCard/VehicleCard';
import { DetailsModal, Pagination, CustomSelect, FilmFilter } from '@/shared/components';
import { useVehicleManufacturerOptions, useVehicleClassOptions } from '@/shared/hooks/useMetadataOptions';
import { useVehicleDetails } from '../../hooks/useVehicleDetails';
import type { Vehicle } from '../../types/vehicles.types';
import { useVehiclesPage } from './VehiclesPage.hooks';
import styles from './VehiclesPage.module.css';

export function VehiclesPage() {
  const [details, setDetails] = useState<{ id: string; title: string; data: Vehicle } | null>(null);
  const {
    name,
    manufacturer,
    vehicleClass,
    filmId,
    sortBy,
    sortOrder,
    page,
    setName,
    setManufacturer,
    setVehicleClass,
    setFilmId,
    setSortBy,
    setSortOrder,
    setPage,
    query,
  } = useVehiclesPage();

  const vehicleDetailsQuery = useVehicleDetails(details?.id ?? null);
  const { options: manufacturerOptions } = useVehicleManufacturerOptions();
  const { options: classOptions } = useVehicleClassOptions();

  const modalVehicle = useMemo(() => {
    if (!details) return null;
    return vehicleDetailsQuery.data ?? details.data;
  }, [details, vehicleDetailsQuery.data]);

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
          value={manufacturer}
          onChange={(value) => setManufacturer(value as string)}
          options={manufacturerOptions}
          placeholder="Filtrar por fabricante"
          className={styles.input}
        />

        <CustomSelect
          value={vehicleClass}
          onChange={(value) => setVehicleClass(value as string)}
          options={classOptions}
          placeholder="Filtrar por classe"
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
            { value: 'crew', label: 'Ordenar por tripulação' },
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

      {query.isLoading && <p className={styles.status}>Carregando veículos...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar veículos.</p>}

      <div className={styles.grid}>
        {query.data?.items.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            variant="compact"
            onViewDetails={() => setDetails({ id: vehicle.id, title: vehicle.name, data: vehicle })}
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
        open={!!details}
        title={details?.title ?? ''}
        onClose={() => setDetails(null)}
      >
        {vehicleDetailsQuery.isLoading && <p className={styles.status}>Carregando detalhes...</p>}
        {vehicleDetailsQuery.isError && (
          <p className={styles.status}>Erro ao carregar detalhes do veículo.</p>
        )}
        {modalVehicle && <VehicleCard vehicle={modalVehicle} />}
      </DetailsModal>
    </section>
  );
}

