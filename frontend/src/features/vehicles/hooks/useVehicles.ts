import { useQuery } from '@tanstack/react-query';
import { fetchVehicles } from '../services/vehicles.service';
import { VehicleFilters } from '../types/vehicles.types';

export function useVehicles(filters: VehicleFilters) {
    return useQuery({
        queryKey: ['vehicles', filters],
        queryFn: () => fetchVehicles(filters),
    });
}

