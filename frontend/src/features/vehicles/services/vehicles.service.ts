import { apiGet } from '@/shared/services/api';
import { PaginatedResponse } from '@/shared/types/common.types';
import { Vehicle, VehicleFilters } from '../types/vehicles.types';

export async function fetchVehicles(filters: VehicleFilters) {
    return apiGet<PaginatedResponse<Vehicle>>('/api/v1/vehicles', {
        name: filters.name,
        manufacturer: filters.manufacturer,
        vehicle_class: filters.vehicleClass,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
        page: filters.page,
        page_size: filters.pageSize,
    });
}

