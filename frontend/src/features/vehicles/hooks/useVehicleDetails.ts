import { useQuery } from '@tanstack/react-query';
import { fetchVehicleById } from '../services/vehicles.service';

export function useVehicleDetails(vehicleId: string | null) {
    return useQuery({
        queryKey: ['vehicle', vehicleId],
        queryFn: () => fetchVehicleById(vehicleId as string),
        enabled: !!vehicleId,
    });
}

