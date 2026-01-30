export interface Starship {
    id: string;
    name: string;
    model: string;
    manufacturer: string;
    starship_class: string;
    crew: number | null;
    passengers: number | null;
}

export interface StarshipFilters {
    name?: string;
    manufacturer?: string;
    sortBy?: 'name' | 'crew';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
