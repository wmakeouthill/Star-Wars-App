export interface Vehicle {
    id: string;
    name: string;
    image_url?: string | null;
    model: string;
    manufacturer: string;
    vehicle_class: string;
    crew: number | null;
    crew_raw?: string | null;
    crew_min?: number | null;
    crew_max?: number | null;
    passengers: number | null;
    passengers_raw?: string | null;
    passengers_min?: number | null;
    passengers_max?: number | null;
}

export interface VehicleFilters {
    name?: string;
    manufacturer?: string;
    vehicleClass?: string;
    sortBy?: 'name' | 'crew';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

