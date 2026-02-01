export interface Planet {
    id: string;
    name: string;
    image_url?: string | null;
    climate: string;
    gravity?: string;
    terrain: string;
    surface_water?: number | null;
    surface_water_raw?: string | null;
    diameter?: number | null;
    diameter_raw?: string | null;
    rotation_period?: number | null;
    rotation_period_raw?: string | null;
    orbital_period?: number | null;
    orbital_period_raw?: string | null;
    population: number | null;
    population_raw?: string | null;
    residents_count?: number;
    residents?: Array<{ id: string; name: string }>;
    films_detail?: Array<{ id: string; title: string }>;
}

export interface PlanetFilters {
    name?: string;
    climate?: string;
    terrain?: string;
    filmId?: string;
    sortBy?: 'name' | 'population';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
