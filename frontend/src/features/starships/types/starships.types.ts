export interface Starship {
    id: string;
    name: string;
    image_url?: string | null;
    model: string;
    manufacturer: string;
    starship_class: string;
    hyperdrive_rating?: number | null;
    hyperdrive_rating_raw?: string | null;
    mglt?: number | null;
    mglt_raw?: string | null;
    cost_in_credits?: number | null;
    cost_in_credits_raw?: string | null;
    length?: number | null;
    length_raw?: string | null;
    max_atmosphering_speed?: number | null;
    max_atmosphering_speed_raw?: string | null;
    cargo_capacity?: number | null;
    cargo_capacity_raw?: string | null;
    consumables?: string;
    crew: number | null;
    crew_raw?: string | null;
    crew_min?: number | null;
    crew_max?: number | null;
    passengers: number | null;
    passengers_raw?: string | null;
    passengers_min?: number | null;
    passengers_max?: number | null;
    films_count?: number;
    pilots_count?: number;
}

export interface StarshipFilters {
    name?: string;
    manufacturer?: string;
    sortBy?: 'name' | 'crew';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
