import { useQuery } from '@tanstack/react-query';
import { metadataService } from '@/shared/services/metadata.service';
import type { CustomSelectOption } from '@/shared/components';

/**
 * Hook para buscar opções de gênero.
 */
export function useGenderOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'genders'],
        queryFn: () => metadataService.getGenders(),
        staleTime: 1000 * 60 * 60, // 1 hora
    });

    const options: CustomSelectOption[] = [
        { value: '', label: 'Todos os gêneros' },
        ...(query.data?.map((gender) => ({
            value: gender,
            label: gender,
        })) || []),
    ];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de clima.
 */
export function useClimateOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'climates'],
        queryFn: () => metadataService.getClimates(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] =
        query.data?.map((climate) => ({
            value: climate,
            label: climate,
        })) || [];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de terreno.
 */
export function useTerrainOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'terrains'],
        queryFn: () => metadataService.getTerrains(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] =
        query.data?.map((terrain) => ({
            value: terrain,
            label: terrain,
        })) || [];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de classificação (species).
 */
export function useClassificationOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'classifications'],
        queryFn: () => metadataService.getClassifications(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] = [
        { value: '', label: 'Todas as classificações' },
        ...(query.data?.map((classification) => ({
            value: classification,
            label: classification,
        })) || []),
    ];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de idioma (species).
 */
export function useLanguageOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'languages'],
        queryFn: () => metadataService.getLanguages(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] = [
        { value: '', label: 'Todos os idiomas' },
        ...(query.data?.map((language) => ({
            value: language,
            label: language,
        })) || []),
    ];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de fabricante de naves.
 */
export function useStarshipManufacturerOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'starship-manufacturers'],
        queryFn: () => metadataService.getStarshipManufacturers(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] = [
        { value: '', label: 'Todos os fabricantes' },
        ...(query.data?.map((manufacturer) => ({
            value: manufacturer,
            label: manufacturer,
        })) || []),
    ];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de classe de nave.
 */
export function useStarshipClassOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'starship-classes'],
        queryFn: () => metadataService.getStarshipClasses(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] = [
        { value: '', label: 'Todas as classes' },
        ...(query.data?.map((cls) => ({
            value: cls,
            label: cls,
        })) || []),
    ];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de fabricante de veículos.
 */
export function useVehicleManufacturerOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'vehicle-manufacturers'],
        queryFn: () => metadataService.getVehicleManufacturers(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] = [
        { value: '', label: 'Todos os fabricantes' },
        ...(query.data?.map((manufacturer) => ({
            value: manufacturer,
            label: manufacturer,
        })) || []),
    ];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de classe de veículo.
 */
export function useVehicleClassOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'vehicle-classes'],
        queryFn: () => metadataService.getVehicleClasses(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] = [
        { value: '', label: 'Todas as classes' },
        ...(query.data?.map((cls) => ({
            value: cls,
            label: cls,
        })) || []),
    ];

    return { options, isLoading: query.isLoading, isError: query.isError };
}

/**
 * Hook para buscar opções de diretor.
 */
export function useDirectorOptions() {
    const query = useQuery({
        queryKey: ['metadata', 'directors'],
        queryFn: () => metadataService.getDirectors(),
        staleTime: 1000 * 60 * 60,
    });

    const options: CustomSelectOption[] = [
        { value: '', label: 'Todos os diretores' },
        ...(query.data?.map((director) => ({
            value: director,
            label: director,
        })) || []),
    ];

    return { options, isLoading: query.isLoading, isError: query.isError };
}
