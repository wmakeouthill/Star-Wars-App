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
    height: number | null;
    mass: number | null;
    hair_color: string;
    skin_color: string;
    eye_color: string;
    birth_year: string;
    gender: string;
    homeworld?: PlanetSummary | null;
    films?: FilmSummary[];
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
