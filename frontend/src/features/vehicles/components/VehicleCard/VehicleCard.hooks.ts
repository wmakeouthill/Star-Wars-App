import { Vehicle } from '../../types/vehicles.types';
import { formatSwapiQuantity } from '@/shared/utils/formatters';

export function useVehicleCard(vehicle: Vehicle) {
    return {
        crewLabel: formatSwapiQuantity({
            value: vehicle.crew,
            raw: vehicle.crew_raw,
            min: vehicle.crew_min ?? null,
            max: vehicle.crew_max ?? null,
        }),
        passengersLabel: formatSwapiQuantity({
            value: vehicle.passengers,
            raw: vehicle.passengers_raw,
            min: vehicle.passengers_min ?? null,
            max: vehicle.passengers_max ?? null,
        }),
    };
}

