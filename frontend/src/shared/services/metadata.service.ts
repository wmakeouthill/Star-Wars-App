import { apiGet } from './api';

/**
 * Metadata Service
 * 
 * Fornece valores únicos de campos para popular dropdowns de filtros.
 */

export interface MetadataOptions {
    genders: string[];
    climates: string[];
    terrains: string[];
    classifications: string[];
    languages: string[];
    starshipManufacturers: string[];
    starshipClasses: string[];
    vehicleManufacturers: string[];
    vehicleClasses: string[];
    directors: string[];
    producers: string[];
}

const METADATA_CACHE: Partial<MetadataOptions> = {};

async function fetchMetadata<T>(
    endpoint: string,
    cacheKey: keyof MetadataOptions
): Promise<T> {
    if (METADATA_CACHE[cacheKey]) {
        return METADATA_CACHE[cacheKey] as T;
    }

    const data = await apiGet<T>(`/api/v1/metadata/${endpoint}`);
    METADATA_CACHE[cacheKey] = data as MetadataOptions[keyof MetadataOptions];
    return data;
}

export const metadataService = {
    async getGenders(): Promise<string[]> {
        return fetchMetadata<string[]>('genders', 'genders');
    },

    async getClimates(): Promise<string[]> {
        return fetchMetadata<string[]>('climates', 'climates');
    },

    async getTerrains(): Promise<string[]> {
        return fetchMetadata<string[]>('terrains', 'terrains');
    },

    async getClassifications(): Promise<string[]> {
        return fetchMetadata<string[]>('classifications', 'classifications');
    },

    async getLanguages(): Promise<string[]> {
        return fetchMetadata<string[]>('languages', 'languages');
    },

    async getStarshipManufacturers(): Promise<string[]> {
        return fetchMetadata<string[]>('starship-manufacturers', 'starshipManufacturers');
    },

    async getStarshipClasses(): Promise<string[]> {
        return fetchMetadata<string[]>('starship-classes', 'starshipClasses');
    },

    async getVehicleManufacturers(): Promise<string[]> {
        return fetchMetadata<string[]>('vehicle-manufacturers', 'vehicleManufacturers');
    },

    async getVehicleClasses(): Promise<string[]> {
        return fetchMetadata<string[]>('vehicle-classes', 'vehicleClasses');
    },

    async getDirectors(): Promise<string[]> {
        return fetchMetadata<string[]>('directors', 'directors');
    },

    async getProducers(): Promise<string[]> {
        return fetchMetadata<string[]>('producers', 'producers');
    },

    /**
     * Limpa o cache de metadata.
     * Útil para forçar refresh dos dados.
     */
    clearCache() {
        Object.keys(METADATA_CACHE).forEach((key) => {
            delete METADATA_CACHE[key as keyof MetadataOptions];
        });
    },
};
