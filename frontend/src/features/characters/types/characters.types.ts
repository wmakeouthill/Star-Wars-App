export interface FilmSummary {
    id: string;
    title: string;
}

export interface PlanetSummary {
    id: string;
    name: string;
}

export interface Character {
    id: string;
    name: string;
    image_url?: string | null;
    height: number | null;
    height_raw?: string | null;
    height_min?: number | null;
    height_max?: number | null;
    mass: number | null;
    mass_raw?: string | null;
    mass_min?: number | null;
    mass_max?: number | null;
    hair_color: string;
    skin_color: string;
    eye_color: string;
    birth_year: string;
    gender: string;
    homeworld?: PlanetSummary | null;
    films?: FilmSummary[];
    species?: Array<{ id: string; name: string }>;
    vehicles?: Array<{ id: string; name: string }>;
    starships?: Array<{ id: string; name: string }>;
}

export interface CharacterFilters {
    name?: string;
    gender?: string;
    homeworld?: string;
    filmId?: string;
    minHeight?: number;
    maxHeight?: number;
    sortBy?: 'name' | 'height' | 'mass';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
