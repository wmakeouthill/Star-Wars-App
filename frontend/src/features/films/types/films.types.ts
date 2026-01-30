export interface NamedResourceSummary {
    id: string;
    name: string;
}

export interface Film {
    id: string;
    title: string;
    image_url?: string | null;
    episode_id: number;
    opening_crawl?: string;
    director: string;
    producer: string;
    release_date: string;
    characters_count?: number;
    planets_count?: number;
    starships_count?: number;
    vehicles_count?: number;
    species_count?: number;
    planets?: NamedResourceSummary[];
    starships?: NamedResourceSummary[];
    vehicles?: NamedResourceSummary[];
    species?: NamedResourceSummary[];
}

export interface FilmFilters {
    title?: string;
    director?: string;
    sortBy?: 'title' | 'episode_id';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
