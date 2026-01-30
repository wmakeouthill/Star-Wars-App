import { useMemo, useState } from 'react';
import { useVehicles } from '../../hooks/useVehicles';

export function useVehiclesPage() {
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [vehicleClass, setVehicleClass] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'crew'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const filters = useMemo(
    () => ({
      name: name || undefined,
      manufacturer: manufacturer || undefined,
      vehicleClass: vehicleClass || undefined,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
    [name, manufacturer, vehicleClass, sortBy, sortOrder, page, pageSize]
  );

  const query = useVehicles(filters);

  return {
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
  };
}

