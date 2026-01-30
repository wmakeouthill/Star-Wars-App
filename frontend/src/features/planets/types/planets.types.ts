export interface Planet {
    id: string;
    name: string;
    climate: string;
    terrain: string;
    population: number | null;
}

export interface PlanetFilters {
    name?: string;
    climate?: string;
    sortBy?: 'name' | 'population';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
