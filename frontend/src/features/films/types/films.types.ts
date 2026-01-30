export interface Film {
    id: string;
    title: string;
    episode_id: number;
    director: string;
    producer: string;
    release_date: string;
}

export interface FilmFilters {
    title?: string;
    director?: string;
    sortBy?: 'title' | 'episode_id';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
