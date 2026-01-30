export interface Species {
    id: string;
    name: string;
    image_url?: string | null;
    classification: string;
    designation: string;
    average_height: number | null;
    average_height_raw?: string | null;
    average_lifespan: number | null;
    average_lifespan_raw?: string | null;
    language: string;
}

export interface SpeciesFilters {
    name?: string;
    classification?: string;
    language?: string;
    sortBy?: 'name' | 'average_height';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

